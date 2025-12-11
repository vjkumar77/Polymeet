// components/VideoGrid.jsx
"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import "./videogrid.css";

// ⭐ Memoized Video Tile - prevents re-renders
const VideoTile = memo(function VideoTile({
  stream,
  isLocal,
  name,
  isHostUser,
  isSpeaking,
}) {
  const videoRef = useRef(null);

  // Set srcObject only when stream reference changes
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream?.getVideoTracks()[0]?.enabled !== false;

  return (
    <div className={`video-tile ${isSpeaking ? "speaking" : ""}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{ display: hasVideo ? "block" : "none" }}
      />

      {!hasVideo && (
        <div className="no-video">
          <div className="avatar-placeholder">
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {isHostUser && <div className="host-badge-tile">Host</div>}

      <div className="user-label">
        {isSpeaking && <span className="speaking-dot"></span>}
        {isLocal ? `${name} (You)` : name}
      </div>
    </div>
  );
});

export default function VideoGrid({
  localStream,
  remoteStreams = {},
  participants = [],
  localName = "You",
  localId = null,
  isHost = false,
}) {
  const [speakingUsers, setSpeakingUsers] = useState({});
  const speakingRef = useRef({});
  const analysersRef = useRef({});
  const intervalRef = useRef(null);

  // ⭐ OPTIMIZED: Use setInterval instead of requestAnimationFrame
  // This is more efficient and doesn't cause re-renders
  useEffect(() => {
    const streams = {
      local: localStream,
      ...remoteStreams,
    };

    // Skip if no streams
    const streamIds = Object.keys(streams).filter((id) => streams[id]);
    if (streamIds.length === 0) return;

    let audioContext;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("AudioContext not supported");
      return;
    }

    // Setup analysers for each stream
    streamIds.forEach((id) => {
      const stream = streams[id];
      if (!stream || analysersRef.current[id]) return;

      try {
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) return;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.85;
        source.connect(analyser);

        analysersRef.current[id] = {
          analyser,
          source,
          dataArray: new Uint8Array(analyser.frequencyBinCount),
        };
      } catch (e) {
        console.warn("Audio setup error:", e);
      }
    });

    // ⭐ Check speaking every 150ms (not every frame!)
    intervalRef.current = setInterval(() => {
      let hasChanges = false;

      Object.entries(analysersRef.current).forEach(([id, { analyser, dataArray }]) => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;
        
        const isSpeaking = average > 25;
        
        if (speakingRef.current[id] !== isSpeaking) {
          speakingRef.current[id] = isSpeaking;
          hasChanges = true;
        }
      });

      // ⭐ Only update state if something changed
      if (hasChanges) {
        setSpeakingUsers({ ...speakingRef.current });
      }
    }, 150); // Check every 150ms

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      Object.values(analysersRef.current).forEach(({ source }) => {
        try {
          source.disconnect();
        } catch (e) {}
      });
      analysersRef.current = {};
      speakingRef.current = {};

      if (audioContext.state !== "closed") {
        audioContext.close();
      }
    };
  }, [localStream, remoteStreams]);

  // Build videos array
  const videos = [
    {
      id: "local",
      stream: localStream,
      isLocal: true,
      name: localName,
      isHostUser: isHost,
    },
    ...Object.keys(remoteStreams).map((pid) => ({
      id: pid,
      stream: remoteStreams[pid],
      isLocal: false,
      name: participants.find((x) => x.id === pid)?.username || `User-${pid.slice(0, 6)}`,
      isHostUser: false,
    })),
  ];

  const gridClass = videos.length === 1 ? "video-grid single-view" : "video-grid";

  return (
    <div className={gridClass}>
      {videos.map((v) => (
        <VideoTile
          key={v.id}
          stream={v.stream}
          isLocal={v.isLocal}
          name={v.name}
          isHostUser={v.isHostUser}
          isSpeaking={speakingUsers[v.id] || false}
        />
      ))}
    </div>
  );
}