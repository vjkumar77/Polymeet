export default function Footer() {
  return (
    <footer className="footer">
      <div>© {new Date().getFullYear()} PolyMeet • Secure Video Meetings</div>
      <div className="footer-links">
        <a>GitHub</a>
        <a>Privacy</a>
        <a>Contact</a>
      </div>
    </footer>
  );
}
