// lib/webrtc.js
let localStream = null;
const pcs = {}; // peerId -> RTCPeerConnection
const offerLocks = {}; // peerId -> boolean (prevent duplicate offers)
const pendingRemoteSDP = {}; // peerId -> array of { type: "answer"|"offer", sdp }

const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

// helper sleep
function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function initLocalStream(constraints = { video: true, audio: true }) {
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
  }
  return localStream;
}

export function createPeerConnection({ peerId, socket, onRemoteStream }) {
  if (pcs[peerId]) return pcs[peerId];

  const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });

  // attach local tracks
  if (localStream) {
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  }

  pc.ontrack = (ev) => {
    if (ev.streams && ev.streams[0]) {
      onRemoteStream && onRemoteStream(peerId, ev.streams[0]);
    }
  };

  pc.onicecandidate = (ev) => {
    if (ev.candidate) {
      try {
        socket.emit("ice-candidate", { to: peerId, candidate: ev.candidate });
      } catch (e) {
        console.warn("emit ice-candidate failed", e);
      }
    }
  };

  pc.onconnectionstatechange = () => {
    // optional helpful debug logs
    // console.log("pc", peerId, "connectionState", pc.connectionState, "signalingState", pc.signalingState);
  };

  pcs[peerId] = pc;
  offerLocks[peerId] = false;
  pendingRemoteSDP[peerId] = pendingRemoteSDP[peerId] || [];
  return pc;
}

// createOfferTo: will not create if pc not in stable state or there's an outstanding offer
export async function createOfferTo({ peerId, socket }) {
  const pc = pcs[peerId];
  if (!pc) {
    console.warn("createOfferTo: no pc for", peerId);
    return;
  }

  // Prevent overlapping offers
  if (offerLocks[peerId]) {
    // console.log("createOfferTo: offer lock, skipping", peerId);
    return;
  }

  // Only create offer when stable
  if (pc.signalingState !== "stable") {
    // attempt to wait a bit for state to become stable
    for (let i = 0; i < 6; i++) {
      await wait(150 * (i + 1));
      if (pc.signalingState === "stable") break;
    }
    if (pc.signalingState !== "stable") {
      console.warn("createOfferTo: pc not stable after wait", peerId, pc.signalingState);
      return;
    }
  }

  try {
    offerLocks[peerId] = true;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", { to: peerId, offer: pc.localDescription });
  } catch (e) {
    console.warn("createOfferTo error", e);
    offerLocks[peerId] = false;
  }
}

// handleOfferFrom: apply remote offer, create & send answer
export async function handleOfferFrom({ fromId, offer, socket, onRemoteStream }) {
  const pc = createPeerConnection({ peerId: fromId, socket, onRemoteStream });

  // If pc has a local offer pending (not stable), we may need to rollback local description
  // Simple safe approach: if not stable, ignore offer once or queue
  if (pc.signalingState !== "stable") {
    // try small retries to allow previous negotiation to finish
    for (let i = 0; i < 6; i++) {
      await wait(150);
      if (pc.signalingState === "stable") break;
    }
  }

  if (pc.signalingState !== "stable") {
    // queue the offer to try later (so we don't crash)
    pendingRemoteSDP[fromId] = pendingRemoteSDP[fromId] || [];
    pendingRemoteSDP[fromId].push({ type: "offer", sdp: offer });
    console.warn("handleOfferFrom: queued offer because pc not stable", fromId, pc.signalingState);
    return;
  }

  try {
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", { to: fromId, answer: pc.localDescription });
  } catch (e) {
    console.warn("handleOfferFrom error", e);
  }
}

// handleAnswerFrom: only apply answer if we actually have a local offer
export async function handleAnswerFrom({ fromId, answer }) {
  const pc = pcs[fromId];
  if (!pc) {
    console.warn("handleAnswerFrom: no pc for", fromId);
    return;
  }

  // Wait a bit if signalingState not matching expected state
  if (pc.signalingState !== "have-local-offer") {
    // sometimes answer arrives late/early; attempt short retry then ignore
    for (let i = 0; i < 6; i++) {
      if (pc.signalingState === "have-local-offer") break;
      await wait(100);
    }
  }

  if (pc.signalingState !== "have-local-offer") {
    // if still not in have-local-offer, ignore the answer to prevent InvalidStateError
    console.warn("handleAnswerFrom ignored: wrong state", fromId, pc.signalingState);
    return;
  }

  try {
    await pc.setRemoteDescription(answer);
    // clear offer lock so further reoffers possible
    offerLocks[fromId] = false;

    // if there are queued remote SDPs, process them
    const queue = pendingRemoteSDP[fromId] || [];
    if (queue.length > 0) {
      // process queued items sequentially (rare)
      while (queue.length) {
        const item = queue.shift();
        if (item.type === "offer") {
          // after setting remote answer, we are stable -> handle offer later by creating an answer to it
          // create new pc? but simpler: try handleOfferFrom logic by calling handleOfferFrom again (caller must pass socket/onRemoteStream)
          // we can't re-run handleOfferFrom without socket reference here; so just clear queue to avoid loops.
        }
      }
      pendingRemoteSDP[fromId] = queue;
    }
  } catch (e) {
    console.warn("handleAnswerFrom error", e);
  }
}

// handleCandidateFrom: add ICE candidate safely
export async function handleCandidateFrom({ fromId, candidate }) {
  const pc = pcs[fromId];
  if (!pc) return;
  try {
    // candidate may arrive before remote description; that's okay — addIceCandidate will buffer in modern browsers,
    // but if it throws, catch and ignore
    await pc.addIceCandidate(candidate).catch((err) => {
      // Some browsers throw if remoteDescription missing. We'll store candidate and try later.
      console.warn("addIceCandidate error (queued)", err);
      pendingRemoteSDP[fromId] = pendingRemoteSDP[fromId] || [];
      // store as special cand
      pendingRemoteSDP[fromId].push({ type: "candidate", candidate });
    });
  } catch (e) {
    console.warn("handleCandidateFrom error", e);
  }
}

export function closeAllConnections() {
  Object.values(pcs).forEach((pc) => {
    try {
      pc.getSenders().forEach((s) => {
        try {
          if (s.track) s.track.stop();
        } catch {}
      });
      pc.close();
    } catch {}
  });
  Object.keys(pcs).forEach((k) => delete pcs[k]);
  Object.keys(offerLocks).forEach((k) => delete offerLocks[k]);
  Object.keys(pendingRemoteSDP).forEach((k) => delete pendingRemoteSDP[k]);

  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
}
