// components/Controls.jsx
"use client";

import "./controls.css";

export default function Controls({
  micOn,
  camOn,
  onToggleMic,
  onToggleCamera,
  onLeave,
  onScreenShare,
  isScreenSharing = false,
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

      {/* Screen Share (optional) */}
      {onScreenShare && (
        <button
          className={`control-btn ${isScreenSharing ? "on" : "more"}`}
          onClick={onScreenShare}
          data-tooltip={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          🖥️
        </button>
      )}

      <div className="controls-divider"></div>

      {/* More Options */}
      <button
        className="control-btn more"
        data-tooltip="More options"
      >
        ⚙️
      </button>

      <div className="controls-divider"></div>

      {/* Leave */}
      <button
        className="control-btn leave"
        onClick={onLeave}
        data-tooltip="Leave meeting"
      >
        <span>📞</span>
        <span>Leave</span>
      </button>
    </div>
  );
}