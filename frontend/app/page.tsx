// app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./styles/home.css";

export default function HomePage() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");

  const startMeeting = () => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 10);
    router.push(`/room/${id}`);
  };

  const joinMeeting = () => {
    if (!joinId.trim()) return alert("Please enter a meeting ID");
    router.push(`/room/${joinId.trim()}`);
  };

  return (
    <div className="home-root">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo">
          <div className="logo-icon">🎥</div>
          <span>PolyMeet</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#how-it-works">How It Works</a>
        </div>
        <div className="nav-actions">
          <button className="btn btn-outline" onClick={startMeeting}>
            Start Free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              <span>Now with HD Video & Screen Share</span>
            </div>
            
            <h1 className="hero-title">
              Video Meetings for <br />
              <span className="gradient-text">Everyone, Everywhere</span>
            </h1>
            
            <p className="hero-description">
              Connect instantly with crystal-clear video, secure encryption, 
              and zero sign-ups required. Experience meetings the way they should be.
            </p>
            
            <div className="hero-actions">
              <button className="btn btn-primary btn-large" onClick={startMeeting}>
                <span className="btn-icon">🚀</span>
                Start Meeting Now
              </button>
              <button className="btn btn-secondary btn-large" onClick={() => document.getElementById('join-section')?.scrollIntoView({ behavior: 'smooth' })}>
                <span className="btn-icon">🔗</span>
                Join with Code
              </button>
            </div>

            {/* Join Section */}
            <div className="join-section" id="join-section">
              <h3>Have a meeting code? Join directly:</h3>
              <div className="join-box">
                <input
                  type="text"
                  className="join-input"
                  placeholder="Enter meeting code (e.g., abc-123-xyz)"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && joinMeeting()}
                />
                <button className="btn btn-primary" onClick={joinMeeting}>
                  Join Meeting
                </button>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-card">
              <div className="hero-preview">
                <div className="preview-tile speaking">
                  <span>👨‍💼</span>
                  <span className="tile-label">You (Host)</span>
                </div>
                <div className="preview-tile">
                  <span>👩‍💻</span>
                  <span className="tile-label">Sarah</span>
                </div>
                <div className="preview-tile">
                  <span>👨‍🎨</span>
                  <span className="tile-label">Mike</span>
                </div>
                <div className="preview-tile">
                  <span>👩‍🔬</span>
                  <span className="tile-label">Emma</span>
                </div>
              </div>
              <div className="hero-controls">
                <button className="control-btn-preview on">🎤</button>
                <button className="control-btn-preview on">📹</button>
                <button className="control-btn-preview on">🖥️</button>
                <button className="control-btn-preview end">📞</button>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="hero-float-1">🔒 End-to-End Encrypted</div>
            <div className="hero-float-2">⚡ Ultra Low Latency</div>
            <div className="hero-float-3">🌍 Works Globally</div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number">10M+</div>
            <div className="stat-label">Meetings Hosted</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">50+</div>
            <div className="stat-label">Countries</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">99.9%</div>
            <div className="stat-label">Uptime</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">4.9★</div>
            <div className="stat-label">User Rating</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="section-header">
          <span className="section-label">FEATURES</span>
          <h2 className="section-title">Everything You Need for Perfect Meetings</h2>
          <p className="section-description">
            Powerful features designed to make your video meetings seamless and productive.
          </p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔐</div>
            <h3>End-to-End Encryption</h3>
            <p>Your conversations are protected with military-grade encryption. No one can intercept your meetings.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>No Sign-Up Required</h3>
            <p>Start or join meetings instantly. No accounts, no passwords, no hassle. Just click and connect.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📺</div>
            <h3>HD Video Quality</h3>
            <p>Crystal clear video that adapts to your connection. Always looks great, even on slower networks.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🖥️</div>
            <h3>Screen Sharing</h3>
            <p>Share your entire screen, a window, or a specific tab. Perfect for presentations and demos.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Waiting Room</h3>
            <p>Control who joins your meeting. Admit participants one by one or all at once.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h3>Works Everywhere</h3>
            <p>Join from any device - desktop, laptop, tablet, or phone. No downloads required.</p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about" id="about">
        <div className="about-container">
          <div className="about-content">
            <span className="section-label">ABOUT US</span>
            <h2>We're Building the Future of Video Communication</h2>
            <p>
              PolyMeet was born from a simple idea: video meetings should be easy, 
              secure, and accessible to everyone. No complicated setups, no mandatory 
              accounts, no compromises on quality.
            </p>
            <p>
              We believe in privacy-first technology. Your conversations stay between 
              you and your participants. Period.
            </p>
            
            <ul className="about-list">
              <li>
                <span className="check">✓</span>
                Built with WebRTC for peer-to-peer connections
              </li>
              <li>
                <span className="check">✓</span>
                Open-source and transparent
              </li>
              <li>
                <span className="check">✓</span>
                No data collection or tracking
              </li>
              <li>
                <span className="check">✓</span>
                Free forever for personal use
              </li>
            </ul>
          </div>
          
          <div className="about-visual">
            <div className="about-card">
              <div className="icon">🚀</div>
              <h4>500ms</h4>
              <p>Average Latency</p>
            </div>
            <div className="about-card">
              <div className="icon">🔒</div>
              <h4>256-bit</h4>
              <p>Encryption</p>
            </div>
            <div className="about-card">
              <div className="icon">👥</div>
              <h4>50+</h4>
              <p>Participants per call</p>
            </div>
            <div className="about-card">
              <div className="icon">💻</div>
              <h4>100%</h4>
              <p>Browser-based</p>
            </div>
            <div className="about-card highlight">
              <div className="icon">❤️</div>
              <h4>Built with Love</h4>
              <p>For teams who value simplicity and privacy</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="steps" id="how-it-works">
        <div className="section-header">
          <span className="section-label">HOW IT WORKS</span>
          <h2 className="section-title">Start Your Meeting in 3 Simple Steps</h2>
          <p className="section-description">
            No downloads, no sign-ups. Get started in seconds.
          </p>
        </div>
        
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Click Start Meeting</h3>
            <p>Hit the button and instantly create a new meeting room with a unique code.</p>
          </div>
          
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Share the Link</h3>
            <p>Copy your meeting link and share it with anyone you want to join.</p>
          </div>
          
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Start Talking</h3>
            <p>Admit participants and enjoy crystal-clear video conversations.</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials">
        <div className="section-header">
          <span className="section-label">TESTIMONIALS</span>
          <h2 className="section-title">Loved by Teams Worldwide</h2>
        </div>
        
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">
              "Finally, a meeting tool that just works! No more 'can you hear me?' 
              issues. PolyMeet has become our go-to for all team calls."
            </p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">JD</div>
              <div className="testimonial-info">
                <h4>John Doe</h4>
                <p>Product Manager at TechCorp</p>
              </div>
            </div>
          </div>
          
          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">
              "The privacy aspect sold me. Knowing my conversations aren't being 
              recorded or analyzed gives me peace of mind."
            </p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">SK</div>
              <div className="testimonial-info">
                <h4>Sarah Kim</h4>
                <p>CEO at StartupXYZ</p>
              </div>
            </div>
          </div>
          
          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">
              "I love that there's no download required. I can share a link and 
              everyone joins instantly. Perfect for client calls!"
            </p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">MJ</div>
              <div className="testimonial-info">
                <h4>Mike Johnson</h4>
                <p>Freelance Designer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-container">
          <h2>Ready to Start Your First Meeting?</h2>
          <p>Join thousands of teams who've made the switch to simpler video calls.</p>
          <div className="cta-actions">
            <button className="btn btn-primary btn-large" onClick={startMeeting}>
              🚀 Start Free Meeting
            </button>
            <button className="btn btn-secondary btn-large" onClick={() => document.getElementById('join-section')?.scrollIntoView({ behavior: 'smooth' })}>
              Join Existing Meeting
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-main">
            <div className="footer-brand">
              <div className="nav-logo">
                <div className="logo-icon">🎥</div>
                <span>PolyMeet</span>
              </div>
              <p>
                Simple, secure, and free video meetings for everyone. 
                No sign-ups, no downloads, no hassle.
              </p>
            </div>
            
            <div className="footer-links">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#">Pricing</a></li>
                <li><a href="#">Download</a></li>
              </ul>
            </div>
            
            <div className="footer-links">
              <h4>Company</h4>
              <ul>
                <li><a href="#about">About Us</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Press</a></li>
              </ul>
            </div>
            
            <div className="footer-links">
              <h4>Legal</h4>
              <ul>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Cookie Policy</a></li>
                <li><a href="#">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} PolyMeet. All rights reserved.</p>
            <div className="footer-social">
              <a href="#">🐦</a>
              <a href="#">📘</a>
              <a href="#">💼</a>
              <a href="#">📷</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}