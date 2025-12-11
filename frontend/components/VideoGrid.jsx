// components/VideoGrid.jsx
"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import "./videogrid.css";

// ⭐ Memoized Video Tile to prevent unnecessary re-renders
const VideoTile = memo(function VideoTile({ 
  id, 
  stream, 
  isLocal, 
  name, 
  isHostUser, 
  isSpeaking 
}) {
  const videoRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(true);

  // ⭐ Set video srcObject only when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [stream]);

  // ⭐ Check video track status
  useEffect(() => {
    if (!stream) {
      setHasVideo(false);
      return;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      setHasVideo(false);
      return;
    }

    // Initial state
    setHasVideo(videoTrack.enabled && videoTrack.readyState === 'live');

    // Listen for track changes
    const handleEnded = () => setHasVideo(false);
    const handleMute = () => setHasVideo(false);
    const handleUnmute = () => setHasVideo(true);

    videoTrack.addEventListener('ended', handleEnded);
    videoTrack.addEventListener('mute', handleMute);
    videoTrack.addEventListener('unmute', handleUnmute);

    return () => {
      videoTrack.removeEventListener('ended', handleEnded);
      videoTrack.removeEventListener('mute', handleMute);
      videoTrack.removeEventListener('unmute', handleUnmute);
    };
  }, [stream]);

  return (
    <div className={`video-tile ${isSpeaking ? "speaking" : ""}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{ display: hasVideo ? "block" : "none" }}
      />

      {/* No video placeholder */}
      {!hasVideo && (
        <div className="no-video">
          <div className="avatar-placeholder">
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Host badge */}
      {isHostUser && <div className="host-badge-tile">Host</div>}

      {/* User label with speaking indicator */}
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
  const audioContextRef = useRef(null);
  const analysersRef = useRef({});
  const speakingRef = useRef({}); // ⭐ Use ref to track speaking without re-renders
  const updateTimeoutRef = useRef(null);

  // ⭐ Debounced state update - only update UI every 200ms
  const updateSpeakingState = useCallback(() => {
    if (updateTimeoutRef.current) return;
    
    updateTimeoutRef.current = setTimeout(() => {
      setSpeakingUsers({ ...speakingRef.current });
      updateTimeoutRef.current = null;
    }, 200); // Update UI only every 200ms
  }, []);

  // ⭐ Speaking detection with debouncing
  useEffect(() => {
    if (!localStream && Object.keys(remoteStreams).length === 0) return;

    // Initialize AudioContext
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn("AudioContext not supported");
        return;
      }
    }

    const audioContext = audioContextRef.current;
    const animationFrames = {};

    // Analyze stream for speaking
    const analyzeStream = (stream, odtreamId) => {
      if (!stream || analysersRef.current[odtreamId]) return;

      try {
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) return;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8; // ⭐ More smoothing
        source.connect(analyser);

        analysersRef.current[odtreamId] = { analyser, source };

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let frameCount = 0;

        const checkVolume = () => {
          if (!analysersRef.current[odtreamId]) return;

          frameCount++;
          
          // ⭐ Only check every 3rd frame (20fps instead of 60fps)
          if (frameCount % 3 !== 0) {
            animationFrames[odtreamId] = requestAnimationFrame(checkVolume);
            return;
          }

          analyser.getByteFrequencyData(dataArray);
          
          // ⭐ Better average calculation (focus on voice frequencies 85-255 Hz)
          let sum = 0;
          const startBin = Math.floor(85 * analyser.fftSize / audioContext.sampleRate);
          const endBin = Math.floor(500 * analyser.fftSize / audioContext.sampleRate);
          
          for (let i = startBin; i < endBin && i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / (endBin - startBin);

          // Threshold for speaking
          const isSpeaking = average > 30;
          
          // ⭐ Update ref (not state) to avoid re-renders
          if (speakingRef.current[odtreamId] !== isSpeaking) {
            speakingRef.current[odtreamId] = isSpeaking;
            updateSpeakingState(); // Debounced UI update
          }

          animationFrames[odtreamId] = requestAnimationFrame(checkVolume);
        };

        checkVolume();
      } catch (e) {
        console.warn("Audio analysis error:", e);
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

    // Cleanup
    return () => {
      // Cancel animation frames
      Object.values(animationFrames).forEach(cancelAnimationFrame);
      
      // Clear timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Disconnect sources
      Object.entries(analysersRef.current).forEach(([id, { source }]) => {
        try {
          source.disconnect();
        } catch (e) {}
        delete analysersRef.current[id];
      });
    };
  }, [localStream, remoteStreams, updateSpeakingState]);

  // Build videos array
  const videos = [];

  // Local video
  videos.push({
    odtreamId: "local",
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
      odtreamId: pid,
      stream,
      isLocal: false,
      name,
      isHostUser: false,
    });
  });

  const gridClass = videos.length === 1 ? "video-grid single-view" : "video-grid";

  return (
    <div className={gridClass}>
      {videos.map((v) => (
        <VideoTile
          key={v.odtreamId}
          id={v.odtreamId}
          stream={v.stream}
          isLocal={v.isLocal}
          name={v.name}
          isHostUser={v.isHostUser}
          isSpeaking={speakingUsers[v.odtreamId] || false}
        />
      ))}
    </div>
  );
}