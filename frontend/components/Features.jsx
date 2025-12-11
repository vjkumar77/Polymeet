export default function Features() {
  const items = [
    {
      title: "No Login Required",
      text: "Join meetings instantly without signing up.",
    },
    {
      title: "Encrypted WebRTC",
      text: "End-to-end secure peer-to-peer video calling.",
    },
    {
      title: "High Quality Video",
      text: "Adaptive HD streaming optimized for any network.",
    },
    {
      title: "Ultra Fast UI",
      text: "Loads in under 1 second with lightweight architecture.",
    },
  ];

  return (
    <section className="features">
      <h2>Why PolyMeet?</h2>
      <div className="feature-grid">
        {items.map((f, i) => (
          <div key={i} className="feature-card">
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
