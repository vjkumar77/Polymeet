// app/room/[id]/RoomClient.jsx
"use client";
import "./room.css";

import { useEffect, useRef, useState, useCallback } from "react";
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
  // ⭐ VALIDATE ROOMID IMMEDIATELY
  console.log("[RoomClient] Mounted with roomId:", roomId);

  const socketRef = useRef(null);
  const isHostRef = useRef(false);
  const offersRef = useRef({});
  const joinedRef = useRef(false);
  const mountedRef = useRef(true);
  const joinRequestSentRef = useRef(false);

  const [localSocketId, setLocalSocketId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [participants, setParticipants] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  const [isHost, setIsHost] = useState(false);
  const [isAdmitted, setIsAdmitted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  // ⭐ Generate username once on mount
  const [username] = useState(() => {
    const name = `User-${Math.floor(Math.random() * 10000)}`;
    console.log("[RoomClient] Generated username:", name);
    return name;
  });

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Create offer helper
  const awaitCreateOffer = useCallback(async (peerId, socket) => {
    try {
      createPeerConnection({
        peerId,
        socket,
        onRemoteStream: (pid, stream) => {
          if (mountedRef.current) {
            setRemoteStreams((prev) => ({ ...prev, [pid]: stream }));
          }
        },
      });

      if (offersRef.current[peerId]) return;
      offersRef.current[peerId] = true;
      await createOfferTo({ peerId, socket });
    } catch (e) {
      console.error("[RTC] createOffer error:", e);
      delete offersRef.current[peerId];
    }
  }, []);

  // ⭐ Initialize local stream
  useEffect(() => {
    mountedRef.current = true;

    const initMedia = async () => {
      try {
        console.log("[MEDIA] Requesting camera/mic...");
        const stream = await initLocalStream();

        if (!mountedRef.current) return;

        console.log("[MEDIA] ✅ Got local stream");
        setLocalStream(stream);
        setMicOn(stream.getAudioTracks()[0]?.enabled ?? true);
        setCamOn(stream.getVideoTracks()[0]?.enabled ?? true);
      } catch (e) {
        console.error("[MEDIA] ❌ Failed to get media:", e);
        setConnectionStatus("media-error");
      }
    };

    initMedia();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ⭐ SOCKET LOGIC
  useEffect(() => {
    // ⭐ CRITICAL: Validate all required data before proceeding
    if (!localStream) {
      console.log("[SOCKET] ⏳ Waiting for localStream...");
      return;
    }

    if (!roomId) {
      console.error("[SOCKET] ❌ roomId is undefined!");
      return;
    }

    if (!username) {
      console.error("[SOCKET] ❌ username is undefined!");
      return;
    }

    console.log("[SOCKET] ✅ All data ready:", { roomId, username });

    // Reset refs
    joinRequestSentRef.current = false;
    isHostRef.current = false;
    joinedRef.current = false;

    const socket = initSocket();
    socketRef.current = socket;

    // ⭐ Send join request function
    const sendJoinRequest = () => {
      if (joinRequestSentRef.current) {
        console.log("[SOCKET] Join already sent, skipping");
        return;
      }

      // ⭐ DOUBLE CHECK before sending
      if (!roomId || !username) {
        console.error("[SOCKET] ❌ Cannot send join-request, missing data:", { roomId, username });
        return;
      }

      const payload = { roomId, username };
      console.log("[SOCKET] 📤 Sending join-request:", JSON.stringify(payload));
      
      joinRequestSentRef.current = true;
      setWaiting(true);
      setConnectionStatus("joining");

      socket.emit("join-request", payload);
    };

    // Handle connect
    const handleConnect = () => {
      console.log("[SOCKET] ✅ Connected:", socket.id);
      if (mountedRef.current) {
        setLocalSocketId(socket.id);
        setConnectionStatus("connected");
      }
      
      // ⭐ Small delay to ensure socket is fully ready
      setTimeout(() => {
        sendJoinRequest();
      }, 100);
    };

    // If already connected
    if (socket.connected) {
      console.log("[SOCKET] Already connected:", socket.id);
      setLocalSocketId(socket.id);
      setTimeout(() => {
        sendJoinRequest();
      }, 100);
    }

    socket.on("connect", handleConnect);

    // YOU ARE HOST
    socket.on("you-are-host", () => {
      console.log("[SOCKET] 👑 I am the HOST!");
      if (!mountedRef.current) return;

      setIsHost(true);
      isHostRef.current = true;
      setIsAdmitted(true);
      joinedRef.current = true;
      setWaiting(false);
      setConnectionStatus("in-room");
    });

    // Waiting for host
    socket.on("waiting-for-host", () => {
      console.log("[SOCKET] ⏳ Waiting for host...");
      if (!mountedRef.current) return;

      setWaiting(true);
      setIsAdmitted(false);
      setConnectionStatus("waiting");
    });

    // Pending requests
    socket.on("pending-requests", (list) => {
      console.log("[SOCKET] 📋 Pending:", list?.length || 0);
      if (mountedRef.current) {
        setPendingRequests(list || []);
      }
    });

    // ADMITTED
    socket.on("admitted", ({ users }) => {
      console.log("[SOCKET] ✅ Admitted!");
      if (!mountedRef.current) return;

      setIsAdmitted(true);
      setWaiting(false);
      joinedRef.current = true;
      setConnectionStatus("in-room");

      const myId = socket.id;
      const others = users.filter((u) => u.id !== myId);
      setParticipants(others);

      others.forEach((u) => {
        createPeerConnection({
          peerId: u.id,
          socket,
          onRemoteStream: (pid, stream) => {
            if (mountedRef.current) {
              setRemoteStreams((prev) => ({ ...prev, [pid]: stream }));
            }
          },
        });
      });

      if (isHostRef.current) {
        others.forEach((u) => awaitCreateOffer(u.id, socket));
      }
    });

    // Room users
    socket.on("room-users", (users) => {
      console.log("[SOCKET] 👥 Room users:", users?.length);
      if (!mountedRef.current) return;

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
          onRemoteStream: (pid, stream) => {
            if (mountedRef.current) {
              setRemoteStreams((p) => ({ ...p, [pid]: stream }));
            }
          },
        })
      );
    });

    // User joined
    socket.on("user-joined", async ({ id, username: newName }) => {
      console.log("[SOCKET] 🆕 User joined:", id);
      if (!mountedRef.current) return;

      setParticipants((prev) => {
        if (prev.some((p) => p.id === id)) return prev;
        return [...prev, { id, username: newName }];
      });

      createPeerConnection({
        peerId: id,
        socket,
        onRemoteStream: (pid, stream) => {
          if (mountedRef.current) {
            setRemoteStreams((prev) => ({ ...prev, [pid]: stream }));
          }
        },
      });

      if (isHostRef.current || joinedRef.current) {
        await awaitCreateOffer(id, socket);
      }
    });

    // Signaling
    socket.on("offer", async ({ from, offer }) => {
      await handleOfferFrom({
        fromId: from,
        offer,
        socket,
        onRemoteStream: (pid, stream) => {
          if (mountedRef.current) {
            setRemoteStreams((p) => ({ ...p, [pid]: stream }));
          }
        },
      });
    });

    socket.on("answer", async ({ from, answer }) => {
      await handleAnswerFrom({ fromId: from, answer });
      delete offersRef.current[from];
    });

    socket.on("ice-candidate", async ({ from, candidate }) => {
      if (candidate) await handleCandidateFrom({ fromId: from, candidate });
    });

    // User left
    socket.on("user-left", (id) => {
      console.log("[SOCKET] 👋 User left:", id);
      if (!mountedRef.current) return;

      setParticipants((prev) => prev.filter((p) => p.id !== id));
      setRemoteStreams((prev) => {
        const c = { ...prev };
        delete c[id];
        return c;
      });
      delete offersRef.current[id];
    });

    // Rejected
    socket.on("rejected", ({ reason }) => {
      alert("Rejected: " + (reason || ""));
      window.location.href = "/";
    });

    // Disconnect
    socket.on("disconnect", (reason) => {
      console.log("[SOCKET] ❌ Disconnected:", reason);
      if (mountedRef.current) {
        setConnectionStatus("disconnected");
      }
    });

    // Cleanup
    return () => {
      console.log("[SOCKET] Cleaning up...");
      socket.off("connect", handleConnect);
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
      socket.off("disconnect");
    };
  }, [localStream, roomId, username, awaitCreateOffer]);

  // Toggles
  const toggleMic = () => {
    const track = localStream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };

  const toggleCamera = () => {
    const track = localStream?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  };

  const admitUser = (id) => {
    socketRef.current?.emit("admit-user", { roomId, userId: id });
  };

  const rejectUser = (id) => {
    socketRef.current?.emit("reject-user", { roomId, userId: id });
  };

  const leaveCall = () => {
    closeAllConnections();
    disconnectSocket();
    window.location.href = "/";
  };

  // ⭐ Loading
  if (!localStream) {
    return (
      <div className="waiting-screen">
        <div className="waiting-card">
          <h2>🎥 Setting up camera...</h2>
          <p>Please allow camera and microphone access.</p>
        </div>
      </div>
    );
  }

  // ⭐ Waiting screen
  if (!isHost && !isAdmitted && waiting) {
    return (
      <div className="waiting-screen">
        <div className="waiting-card">
          <h2>⏳ Waiting for host to admit you…</h2>
          <p>Room: {roomId}</p>
          <p style={{ fontSize: "12px", opacity: 0.6, marginTop: "10px" }}>
            Status: {connectionStatus} | Socket: {localSocketId || "connecting..."}
          </p>
          <button
            onClick={leaveCall}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#ef4444",
              border: "none",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ⭐ Main room
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
              {isHost && <span className="host-badge">Host</span>}
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
              {pendingRequests.length === 0 && (
                <div className="muted">No one waiting</div>
              )}
              {pendingRequests.map((p) => (
                <div className="person" key={p.id}>
                  <div className="name">{p.username}</div>
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