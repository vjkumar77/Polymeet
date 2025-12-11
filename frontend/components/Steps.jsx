export default function Steps() {
  const steps = [
    { title: "1. Start a Meeting", text: "Click start, no login needed." },
    { title: "2. Allow Camera", text: "PolyMeet auto-detects your devices." },
    { title: "3. You're In!", text: "Invite others using your meeting link." },
  ];

  return (
    <section className="steps">
      <h2>How It Works</h2>

      <div className="step-grid">
        {steps.map((s, i) => (
          <div key={i} className="step-card">
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
