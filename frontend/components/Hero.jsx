export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>Fast, Secure, Login-Free Meetings</h1>
        <p>
          PolyMeet lets you start or join meetings instantly — no signup,
          no tracking, just smooth encrypted video calls.
        </p>

        <div className="hero-actions">
          <button className="btn-primary">Start New Meeting</button>

          <div className="join-box">
            <input placeholder="Enter meeting code" />
            <button className="btn-secondary">Join</button>
          </div>
        </div>
      </div>
    </section>
  );
}
