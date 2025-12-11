"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import "@/app/styles/home.css"; // ensure this is loaded

export default function Hero() {
  const router = useRouter();
  const [showJoinBox, setShowJoinBox] = useState(false);
  const [joinId, setJoinId] = useState("");

  // Create Meeting → redirect to /room/<random-id>
  function handleStartMeeting() {
    const id = Math.random().toString(36).substring(2, 10);
    router.push(`/room/${id}`);
  }

  // Join Meeting → redirect to /room/<entered-id>
  function handleJoin() {
    if (!joinId.trim()) {
      alert("Enter a meeting ID");
      return;
    }
    router.push(`/room/${joinId}`);
  }

  return (
    <div className="hero">
      <h1>Seamless Video Meetings</h1>
      <p>No login required. Join instantly with a single link.</p>

      <div className="hero-buttons">
        <button className="btn-start" onClick={handleStartMeeting}>
          Start Meeting
        </button>

        <button className="btn-join" onClick={() => setShowJoinBox(true)}>
          Join Meeting
        </button>
      </div>

      {showJoinBox && (
        <div className="join-box">
          <input
            type="text"
            placeholder="Enter meeting ID"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
          />
          <button onClick={handleJoin}>Join</button>
          <button className="close" onClick={() => setShowJoinBox(false)}>
            ✖
          </button>
        </div>
      )}
    </div>
  );
}
