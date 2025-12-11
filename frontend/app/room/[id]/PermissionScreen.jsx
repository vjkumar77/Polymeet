"use client";

import { useState } from "react";
import "./permission.css";

export default function PermissionScreen({ onAllow }) {
  const [error, setError] = useState("");

  async function requestPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      onAllow(stream); // pass stream back to RoomClient
    } catch (err) {
      setError("Please allow camera & microphone to continue.");
    }
  }

  return (
    <div className="permission-container">
      <div className="permission-card">
        <h1 className="title">PolyMeet</h1>
        <p className="subtitle">
          Allow access to your Camera & Microphone
        </p>

        <button className="btn-allow" onClick={requestPermission}>
          Allow Access
        </button>

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
