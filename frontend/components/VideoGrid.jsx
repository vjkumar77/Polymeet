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

  // ⭐ Speaking detection using Web Audio API
  useEffect(() => {
    if (!localStream) return;

    // Initialize AudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;

    // Analyze local stream
    const analyzeStream = (stream, odtreamId) => {
      if (!stream || analysersRef.current[streamId]) return;

      try {
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) return;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);

        analysersRef.current[streamId] = { analyser, source };

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (!analysersRef.current[streamId]) return;
          
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          
          // Threshold for speaking detection
          const isSpeaking = average > 25;
          
          setSpeakingUsers(prev => {
            if (prev[streamId] !== isSpeaking) {
              return { ...prev, [streamId]: isSpeaking };
            }
            return prev;
          });

          requestAnimationFrame(checkVolume);
        };

        checkVolume();
      } catch (e) {
        console.warn("Audio analysis error:", e);
      }
    };

    // Analyze local stream
    analyzeStream(localStream, "local");

    // Analyze remote streams
    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      analyzeStream(stream, peerId);
    });

    return () => {
      // Cleanup analysers
      Object.values(analysersRef.current).forEach(({ source }) => {
        try {
          source.disconnect();
        } catch (e) {}
      });
    };
  }, [localStream, remoteStreams]);

  // Build videos array
  const videos = [];

  // Local video
  videos.push({
    id: "local",
    odtreamId: "local",
    stream: localStream,
    isLocal: true,
    name: localName,
    isHost: isHost,
  });

  // Remote videos
  Object.keys(remoteStreams).forEach((pid) => {
    const stream = remoteStreams[pid];
    const p = participants.find((x) => x.id === pid);
    const name = p?.username || `User-${pid.slice(0, 6)}`;

    videos.push({
      id: pid,
      streamId: pid,
      stream,
      isLocal: false,
      name,
      isHost: false,
    });
  });

  const gridClass = videos.length === 1 ? "video-grid single-view" : "video-grid";

  return (
    <div className={gridClass}>
      {videos.map((v) => {
        const isSpeaking = speakingUsers[v.streamId];
        const hasVideo = v.stream?.getVideoTracks()[0]?.enabled;

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
              style={{ display: hasVideo !== false ? "block" : "none" }}
            />

            {/* No video placeholder */}
            {hasVideo === false && (
              <div className="no-video">
                <div className="avatar-placeholder">
                  {v.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            {/* Host badge */}
            {v.isHost && <div className="host-badge-tile">Host</div>}

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