// components/VideoGrid.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import "./videogrid.css";

export default function VideoGrid({
  localStream,
  remoteStreams = {},
  participants = [],
  localName = "You",
  localId = null,
  isHost = false,
}) {
  const [speakingUsers, setSpeakingUsers] = useState({});
  const audioContextRef = useRef(null);
  const analysersRef = useRef({});
  const animationFrameRef = useRef({});

  // ⭐ Speaking detection using Web Audio API
  useEffect(() => {
    // Skip if no streams
    if (!localStream && Object.keys(remoteStreams).length === 0) return;

    // Initialize AudioContext (only once)
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn("AudioContext not supported");
        return;
      }
    }

    const audioContext = audioContextRef.current;

    // Function to analyze a stream
    const analyzeStream = (stream, id) => {  // ✅ FIXED: "id" instead of typo
      if (!stream || analysersRef.current[id]) return;

      try {
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack || !audioTrack.enabled) return;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);

        analysersRef.current[id] = { analyser, source };

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (!analysersRef.current[id]) return;

          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

          // Threshold for speaking detection
          const isSpeaking = average > 25;

          setSpeakingUsers((prev) => {
            if (prev[id] !== isSpeaking) {
              return { ...prev, [id]: isSpeaking };
            }
            return prev;
          });

          animationFrameRef.current[id] = requestAnimationFrame(checkVolume);
        };

        checkVolume();
      } catch (e) {
        console.warn("Audio analysis error for", id, e);
      }
    };

    // Analyze local stream
    if (localStream) {
      analyzeStream(localStream, "local");
    }

    // Analyze remote streams
    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      if (stream) {
        analyzeStream(stream, peerId);
      }
    });

    // Cleanup function
    return () => {
      // Cancel all animation frames
      Object.values(animationFrameRef.current).forEach((id) => {
        cancelAnimationFrame(id);
      });
      animationFrameRef.current = {};

      // Disconnect all sources
      Object.entries(analysersRef.current).forEach(([id, { source }]) => {
        try {
          source.disconnect();
        } catch (e) {}
      });
      analysersRef.current = {};
    };
  }, [localStream, remoteStreams]);

  // Build videos array
  const videos = [];

  // Local video first
  videos.push({
    id: "local",
    visibilityId: "local",
    stream: localStream,
    isLocal: true,
    name: localName,
    isHostUser: isHost,
  });

  // Remote videos
  Object.keys(remoteStreams).forEach((pid) => {
    const stream = remoteStreams[pid];
    const p = participants.find((x) => x.id === pid);
    const name = p?.username || `User-${pid.slice(0, 6)}`;

    videos.push({
      id: pid,
      visibilityId: pid,
      stream,
      isLocal: false,
      name,
      isHostUser: false,
    });
  });

  const gridClass = videos.length === 1 ? "video-grid single-view" : "video-grid";

  return (
    <div className={gridClass}>
      {videos.map((v) => {
        const isSpeaking = speakingUsers[v.visibilityId] || false;
        const videoTrack = v.stream?.getVideoTracks()[0];
        const hasVideo = videoTrack?.enabled !== false;

        return (
          <div
            key={v.id}
            className={`video-tile ${isSpeaking ? "speaking" : ""}`}
          >
            {/* Video element */}
            <video
              autoPlay
              playsInline
              muted={v.isLocal}
              ref={(el) => {
                if (el && v.stream) {
                  el.srcObject = v.stream;
                }
              }}
              style={{ display: hasVideo ? "block" : "none" }}
            />

            {/* No video placeholder */}
            {!hasVideo && (
              <div className="no-video">
                <div className="avatar-placeholder">
                  {v.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            {/* Host badge */}
            {v.isHostUser && <div className="host-badge-tile">Host</div>}

            {/* User label with speaking indicator */}
            <div className="user-label">
              {isSpeaking && <span className="speaking-dot"></span>}
              {v.isLocal ? `${v.name} (You)` : v.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}