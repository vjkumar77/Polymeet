

export default function Hero() {
  return (
    <div className="hero">
      <div className="home-cta">
  <button className="btn primary" onClick={startMeeting}>
    Start Meeting
  </button>

  <div className="join-box">
    <input
      value={joinId}
      onChange={(e) => setJoinId(e.target.value)}
      placeholder="Enter meeting id (or paste)"
      className="join-input"
    />
    <button className="btn" onClick={joinMeeting}>
      Join Meeting
    </button>
  </div>
</div>
    </div>
  );
}
