"use client";
import React from "react";
import "./controls.css"; // optional - you can style or inline

export default function Controls({ micOn, camOn, onToggleMic, onToggleCamera, onLeave }) {
  return (
    <div className="controls">
      <button onClick={onToggleMic} className="control-btn">{micOn ? "Mic On" : "Mic Off"}</button>
      <button onClick={onToggleCamera} className="control-btn">{camOn ? "Camera On" : "Camera Off"}</button>
      <button onClick={onLeave} className="control-btn leave">Leave</button>
    </div>
  );
}
