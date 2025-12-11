"use client";

export default function Hero({ startMeeting, joinMeeting, joinId, setJoinId }) {
  return (
    <div className="hero">
      <div className="hero-content">
        <h1>PolyMeet</h1>
        <p>Secure, fast, and easy video meetings for everyone.</p>
      </div>

      <div className="hero-actions">
        <button className="btn-primary" onClick={startMeeting}>
          Start Meeting
        </button>

        <div className="join-box">
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Enter meeting ID"
            className="join-input"
          />

          <button className="btn-secondary" onClick={joinMeeting}>
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
