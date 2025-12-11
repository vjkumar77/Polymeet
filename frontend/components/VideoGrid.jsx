// Filename: components/VideoGrid.jsx
"use client";
import "./videogrid.css";

export default function VideoGrid({
  localStream,
  remoteStreams = {}, // object: { [peerId]: MediaStream }
  participants = [],   // array: [{id, username}, ...]
  localName = "You",
  localId = null,
}) {
  // Build a unified array of videos: local first, then remote
  const videos = [];

  // local
  videos.push({
    id: localId || "local",
    stream: localStream || null,
    isLocal: true,
    name: localName || "You",
  });

  // remote: iterate remoteStreams keys
  Object.keys(remoteStreams).forEach((pid) => {
    const stream = remoteStreams[pid];
    const p = participants.find((x) => x.id === pid);
    const name = p?.username || `User-${pid.slice(0, 6)}`;
    videos.push({
      id: pid,
      stream,
      isLocal: false,
      name,
    });
  });

  return (
    <div className="video-grid">
      {videos.map((v) => (
        <div key={v.id} className="video-tile">
          <video
            autoPlay
            playsInline
            muted={v.isLocal}
            ref={(el) => {
              if (el && v.stream) el.srcObject = v.stream;
            }}
          />
          <div className="user-label">
            {v.isLocal ? `${v.name} (You)` : v.name}
          </div>
        </div>
      ))}
    </div>
  );
}
