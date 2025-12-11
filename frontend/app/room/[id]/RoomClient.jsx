// app/room/[id]/RoomClient.jsx
"use client";
import "./room.css";

import { useEffect, useRef, useState } from "react";
import VideoGrid from "@/components/VideoGrid";
import Controls from "@/components/Controls";
import { initSocket, disconnectSocket } from "@/lib/socket";

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
  const joinedRef = useRef(false);
  const joinRequestSentRef = useRef(false); // ⭐ NEW: prevent duplicate join requests

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

  // Generate username once
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
      } catch (e) {
        console.error("Failed to get media:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ⭐ MAIN SOCKET LOGIC - FIXED
  useEffect(() => {
    if (!localStream || !username) return;

    // Reset refs for fresh connection
    joinRequestSentRef.current = false;
    isHostRef.current = false;
    joinedRef.current = false;

    const socket = initSocket();
    socketRef.current = socket;

    // ⭐ Function to send join request
    const sendJoinRequest = () => {
      if (joinRequestSentRef.current) {
        console.log("[CLIENT] Join request already sent, skipping");
        return;
      }
      
      console.log("[CLIENT] Sending join-request for room:", roomId, "socket:", socket.id);
      joinRequestSentRef.current = true;
      socket.emit("join-request", { roomId, username });
      setWaiting(true);
    };

    // ⭐ CRITICAL: Handle connection event
    socket.on("connect", () => {
      console.log("[CLIENT] ✅ Socket connected:", socket.id);
      setLocalSocketId(socket.id);
      
      // ⭐ Send join request ONLY after connected
      sendJoinRequest();
    });

    // ⭐ If socket is ALREADY connected (rare but possible)
    if (socket.connected) {
      console.log("[CLIENT] Socket already connected:", socket.id);
      setLocalSocketId(socket.id);
      sendJoinRequest();
    }

    // Handle reconnection
    socket.on("reconnect", () => {
      console.log("[CLIENT] Socket reconnected:", socket.id);
      joinRequestSentRef.current = false; // Allow re-sending join request
      sendJoinRequest();
    });

    // ⭐ YOU ARE HOST
    socket.on("you-are-host", () => {
      console.log("[CLIENT] ✅ I am the HOST!");
      setIsHost(true);
      isHostRef.current = true;
      setIsAdmitted(true);
      joinedRef.current = true;
      setWaiting(false);
    });

    // Waiting for host
    socket.on("waiting-for-host", () => {
      console.log("[CLIENT] Waiting for host to admit...");
      setWaiting(true);
      setIsAdmitted(false);
    });

    // Pending requests (for host)
    socket.on("pending-requests", (list) => {
      console.log("[CLIENT] Pending requests:", list);
      setPendingRequests(list || []);
    });

    // ⭐ ADMITTED - Guest is allowed in
    socket.on("admitted", ({ users }) => {
      console.log("[CLIENT] ✅ Admitted to room! Users:", users);
      setIsAdmitted(true);
      setWaiting(false);
      joinedRef.current = true;

      const myId = socket.id;
      const others = users.filter((u) => u.id !== myId);
      setParticipants(others);

      // Init PC for all existing users
      others.forEach((u) => {
        createPeerConnection({
          peerId: u.id,
          socket,
          onRemoteStream: (pid, stream) =>
            setRemoteStreams((prev) => ({ ...prev, [pid]: stream })),
        });
      });

      // Host sends offers to all
      if (isHostRef.current) {
        others.forEach((u) => awaitCreateOffer(u.id, socket));
      }
    });

    // Room users update
    socket.on("room-users", (users) => {
      console.log("[CLIENT] Room users update:", users);
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

    // ⭐ USER JOINED
    socket.on("user-joined", async ({ id, username: newName }) => {
      console.log("[CLIENT] User joined:", id, newName);
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

      // Host always sends offer to new user
      if (isHostRef.current) {
        await awaitCreateOffer(id, socket);
        return;
      }

      // Guest mesh: guests also send offer to new users
      if (id !== myId && joinedRef.current) {
        await awaitCreateOffer(id, socket);
      }
    });

    // SIGNALING
    socket.on("offer", async ({ from, offer }) => {
      console.log("[CLIENT] Received offer from:", from);
      await handleOfferFrom({
        fromId: from,
        offer,
        socket,
        onRemoteStream: (pid, stream) =>
          setRemoteStreams((p) => ({ ...p, [pid]: stream })),
      });
    });

    socket.on("answer", async ({ from, answer }) => {
      console.log("[CLIENT] Received answer from:", from);
      await handleAnswerFrom({ fromId: from, answer });
      delete offersRef.current[from];
    });

    socket.on("ice-candidate", async ({ from, candidate }) => {
      if (candidate) await handleCandidateFrom({ fromId: from, candidate });
    });

    // User left
    socket.on("user-left", (id) => {
      console.log("[CLIENT] User left:", id);
      setParticipants((prev) => prev.filter((p) => p.id !== id));

      setRemoteStreams((prev) => {
        const c = { ...prev };
        delete c[id];
        return c;
      });

      delete offersRef.current[id];
    });

    // Rejected by host
    socket.on("rejected", ({ reason }) => {
      alert("You were rejected by host: " + (reason || ""));
      window.location.href = "/";
    });

    // Connection error handling
    socket.on("connect_error", (err) => {
      console.error("[CLIENT] Connection error:", err.message);
    });

    // ⭐ CLEANUP on unmount
    return () => {
      console.log("[CLIENT] Cleaning up socket...");
      socket.off("connect");
      socket.off("reconnect");
      socket.off("you-are-host");
      socket.off("waiting-for-host");
      socket.off("pending-requests");
      socket.off("admitted");
      socket.off("room-users");
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-left");
      socket.off("rejected");
      socket.off("connect_error");
      closeAllConnections();
    };
  }, [localStream, username, roomId]);

  // TOGGLE FUNCTIONS
  const toggleMic = () => {
    const t = localStream?.getAudioTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      setMicOn(t.enabled);
    }
  };

  const toggleCamera = () => {
    const t = localStream?.getVideoTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      setCamOn(t.enabled);
    }
  };

  const admitUser = (id) => {
    console.log("[CLIENT] Admitting user:", id);
    socketRef.current?.emit("admit-user", { roomId, userId: id });
  };

  const rejectUser = (id) => {
    console.log("[CLIENT] Rejecting user:", id);
    socketRef.current?.emit("reject-user", { roomId, userId: id });
  };

  const leaveCall = () => {
    closeAllConnections();
    disconnectSocket();
    window.location.href = "/";
  };

  // ⭐ WAITING SCREEN - Show only for non-hosts who are waiting
  if (!isHost && !isAdmitted && waiting) {
    return (
      <div className="waiting-screen">
        <div className="waiting-card">
          <h2>Waiting for host to admit you…</h2>
          <p>Please wait.</p>
          <button 
            onClick={leaveCall} 
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#ef4444",
              border: "none",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ⭐ MAIN ROOM UI
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
              alert("Link copied!");
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

      {/* SIDEBAR */}
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
                  </div>
                  <div className="actions">
                    <button className="admit" onClick={() => admitUser(p.id)}>
                      Admit
                    </button>
                    <button className="reject" onClick={() => rejectUser(p.id)}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* VIDEO GRID */}
      <main className="video-area">
        <VideoGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          participants={participants}
          localName={username}
          localId={localSocketId}
        />
      </main>

      {/* CONTROLS */}
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