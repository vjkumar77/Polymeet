// components/Controls.jsx
"use client";

import "./controls.css";

export default function Controls({
  micOn,
  camOn,
  onToggleMic,
  onToggleCamera,
  onLeave,
  isHost = false,
}) {
  return (
    <div className="controls-bar">
      {/* Microphone */}
      <button
        className={`control-btn ${micOn ? "on" : "off"}`}
        onClick={onToggleMic}
        data-tooltip={micOn ? "Mute" : "Unmute"}
      >
        {micOn ? "🎤" : "🔇"}
      </button>

      {/* Camera */}
      <button
        className={`control-btn ${camOn ? "on" : "off"}`}
        onClick={onToggleCamera}
        data-tooltip={camOn ? "Turn off camera" : "Turn on camera"}
      >
        {camOn ? "📹" : "📷"}
      </button>

      <div className="controls-divider"></div>

      {/* Leave/End Button */}
      <button
        className={`control-btn leave ${isHost ? "host-leave" : ""}`}
        onClick={onLeave}
        data-tooltip={isHost ? "End meeting for all" : "Leave meeting"}
      >
        <span>📞</span>
        <span>{isHost ? "End" : "Leave"}</span>
      </button>
    </div>
  );
}