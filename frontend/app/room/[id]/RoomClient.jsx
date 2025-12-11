"use client";
import "./room.css";

import { useEffect, useRef, useState } from "react";
import VideoGrid from "@/components/VideoGrid";
import Controls from "@/components/Controls";
import { initSocket } from "@/lib/socket";

import {
  initLocalStream,
  createPeerConnection,
  createOfferTo,
  handleOfferFrom,
  handleAnswerFrom,
  handleCandidateFrom,
  closeAllConnections,
} from "@/lib/webrtc";

export default function RoomClient({ roomId }) {
  const socketRef = useRef(null);
  const isHostRef = useRef(false);
  const offersRef = useRef({});
  const joinedRef = useRef(false);          // ⭐ REQUIRED

  const [localSocketId, setLocalSocketId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [participants, setParticipants] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  const [isHost, setIsHost] = useState(false);
  const [isAdmitted, setIsAdmitted] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const [username, setUsername] = useState(null);

  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // -----------------------------------------------
  async function awaitCreateOffer(peerId, socket) {
    try {
      createPeerConnection({
        peerId,
        socket,
        onRemoteStream: (pid, stream) =>
          setRemoteStreams((prev) => ({ ...prev, [pid]: stream })),
      });

      if (offersRef.current[peerId]) return;

      offersRef.current[peerId] = true;
      await createOfferTo({ peerId, socket });
    } catch (e) {
      delete offersRef.current[peerId];
    }
  }
  // -----------------------------------------------

  useEffect(() => {
    setUsername(`User-${Math.floor(Math.random() * 10000)}`);
  }, []);

  // Initialize camera/mic
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await initLocalStream();
        if (!mounted) return;

        setLocalStream(stream);
        setMicOn(stream.getAudioTracks()[0]?.enabled ?? false);
        setCamOn(stream.getVideoTracks()[0]?.enabled ?? false);
      } catch (e) {}
    })();
    return () => (mounted = false);
  }, []);

  // SOCKET LOGIC
  useEffect(() => {
    if (!localStream || !username) return;

    const socket = initSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      setLocalSocketId(socket.id);
    });

    // join request
    socket.emit("join-request", { roomId, username });
    setWaiting(true);

    // Host
    socket.on("you-are-host", () => {
      setIsHost(true);
      isHostRef.current = true;

      setIsAdmitted(true);
      joinedRef.current = true;   // ⭐ HOST IS ADMITTED
      setWaiting(false);
    });

    socket.on("waiting-for-host", () => {
      setWaiting(true);
      setIsAdmitted(false);
    });

    socket.on("pending-requests", (list) => {
      setPendingRequests(list || []);
    });

    // ★ ADMITTED (MOST IMPORTANT BLOCK)
    socket.on("admitted", ({ users }) => {
      setIsAdmitted(true);
      setWaiting(false);

      joinedRef.current = true;   // ⭐ GUEST IS FULLY IN THE MEETING

      const myId = socket.id;
      const others = users.filter((u) => u.id !== myId);
      setParticipants(others);

      // Init PC for all
      others.forEach((u) => {
        createPeerConnection({
          peerId: u.id,
          socket,
          onRemoteStream: (pid, stream) =>
            setRemoteStreams((prev) => ({ ...prev, [pid]: stream })),
        });
      });

      // Host → send initial offers
      if (isHostRef.current) {
        others.forEach((u) => awaitCreateOffer(u.id, socket));
      }
    });

    // Room users update
    socket.on("room-users", (users) => {
      const myId = socket.id;
      const others = users.filter((u) => u.id !== myId);

      setParticipants((prev) => {
        const merged = [...prev];
        others.forEach((o) => {
          if (!merged.some((p) => p.id === o.id)) merged.push(o);
        });
        return merged;
      });

      others.forEach((u) =>
        createPeerConnection({
          peerId: u.id,
          socket,
          onRemoteStream: (pid, stream) =>
            setRemoteStreams((p) => ({ ...p, [pid]: stream })),
        })
      );
    });

    // ★ USER JOINED (GUEST ↔ GUEST FIX)
    socket.on("user-joined", async ({ id, username: newName }) => {
      const myId = socket.id;

      setParticipants((prev) => {
        if (prev.some((p) => p.id === id)) return prev;
        return [...prev, { id, username: newName }];
      });

      createPeerConnection({
        peerId: id,
        socket,
        onRemoteStream: (pid, stream) =>
          setRemoteStreams((prev) => ({ ...prev, [pid]: stream })),
      });

      if (isHostRef.current) {
        await awaitCreateOffer(id, socket);
        return;
      }

      // ⭐ GUEST MESH FIX — guests ALWAYS send offer to new user
      if (id !== myId && joinedRef.current) {
        await awaitCreateOffer(id, socket);
      }
    });

    // SIGNALING
    socket.on("offer", async ({ from, offer }) => {
      await handleOfferFrom({
        fromId: from,
        offer,
        socket,
        onRemoteStream: (pid, stream) =>
          setRemoteStreams((p) => ({ ...p, [pid]: stream })),
      });
    });

    socket.on("answer", async ({ from, answer }) => {
      await handleAnswerFrom({ fromId: from, answer });
      delete offersRef.current[from];
    });

    socket.on("ice-candidate", async ({ from, candidate }) => {
      if (candidate) await handleCandidateFrom({ fromId: from, candidate });
    });

    socket.on("user-left", (id) => {
      setParticipants((prev) => prev.filter((p) => p.id !== id));

      setRemoteStreams((prev) => {
        const c = { ...prev };
        delete c[id];
        return c;
      });

      delete offersRef.current[id];
    });

    socket.on("rejected", ({ reason }) => {
      alert("You were rejected by host: " + (reason || ""));
    });

    return () => {
      socket.off();
      closeAllConnections();
    };
  }, [localStream, username, roomId]);

  // TOGGLES
  const toggleMic = () => {
    const t = localStream.getAudioTracks()[0];
    t.enabled = !t.enabled;
    setMicOn(t.enabled);
  };

  const toggleCamera = () => {
    const t = localStream.getVideoTracks()[0];
    t.enabled = !t.enabled;
    setCamOn(t.enabled);
  };

  const admitUser = (id) =>
    socketRef.current?.emit("admit-user", { roomId, userId: id });

  const rejectUser = (id) =>
    socketRef.current?.emit("reject-user", { roomId, userId: id });

  const leaveCall = () => {
    closeAllConnections();
    socketRef.current?.disconnect();
    window.location.href = "/";
  };

  if (!isHostRef.current && !isAdmitted && waiting) {
    return (
      <div className="waiting-screen">
        <div className="waiting-card">
          <h2>Waiting for host to admit you…</h2>
          <p>Please wait.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="room-root">
      <div className="topbar">
        <div className="room-info">
          <div className="label">Meeting ID</div>
          <div className="room-id">{roomId}</div>
        </div>

        <div className="top-actions">
          <button
            className="btn invite"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Copied!");
            }}
          >
            Invite
          </button>

          <button className="btn people" onClick={() => setSidebarOpen((s) => !s)}>
            👥 {participants.length + 1}
          </button>

          {isHost && <div className="host-badge">HOST</div>}
        </div>
      </div>

      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <button className="close-sidebar" onClick={() => setSidebarOpen(false)}>
          ✖
        </button>

        <h3>People</h3>

        <div className="section">
          <div className="section-title">In Meeting</div>
          <div className="list">
            <div className="person">
              <div className="name">{username} (You)</div>
              {isHost && <div className="small-badge">Host</div>}
            </div>

            {participants.map((p) => (
              <div className="person" key={p.id}>
                <div className="name">{p.username}</div>
                <div className="id">{p.id}</div>
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <div className="section">
            <div className="section-title">Waiting Room</div>
            <div className="list">
              {pendingRequests.length === 0 && <div className="muted">No one waiting</div>}
              {pendingRequests.map((p) => (
                <div className="person" key={p.id}>
                  <div>
                    <div className="name">{p.username}</div>
                    <div className="id">{p.id}</div>
                  </div>
                  <div className="actions">
                    <button className="admit" onClick={() => admitUser(p.id)}>Admit</button>
                    <button className="reject" onClick={() => rejectUser(p.id)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <main className="video-area">
        <VideoGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          participants={participants}
          localName={username}
          localId={localSocketId}
        />
      </main>

      <footer className="controls-wrap">
        <Controls
          micOn={micOn}
          camOn={camOn}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onLeave={leaveCall}
        />
      </footer>
    </div>
  );
}
