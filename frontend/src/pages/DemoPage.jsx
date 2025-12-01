import "./DemoPage.css";
import { Link } from "react-router-dom";

export default function DemoPage() {
  return (
    <div className="demo-page">

      {/* HEADER / SAME VIBE AS LANDING */}
      <header className="demo-header">
        <Link to="/" className="demo-logo">
  <span className="demo-logo-text">Glide</span>
  <span className="demo-logo-plus">+</span>
</Link>

        <Link to="/login" className="demo-login-btn">
          Log In
        </Link>
      </header>

      {/* HERO PREVIEW */}
      <section className="demo-hero">
        <h1>Your Glide+ Preview</h1>
        <p>See what your student life will look like — organized, clear, and stress-free.</p>
      </section>

      {/* SCREENSHOTS / PLACEHOLDERS */}
      <section className="demo-grid">

        <div className="demo-card">
          <h3>Dashboard Overview</h3>
          <div className="demo-img placeholder">
            Dashboard Preview
          </div>
          <p>Your tasks, streaks, XP, and habits — all in one place.</p>
        </div>

        <div className="demo-card">
          <h3>Smart Planner</h3>
          <div className="demo-img placeholder">
            Planner Preview
          </div>
          <p>Auto-adjusting calendar that adapts when your schedule changes.</p>
        </div>

        <div className="demo-card">
          <h3>Goals & Habits</h3>
          <div className="demo-img placeholder">
            Goals Preview
          </div>
          <p>Track habits, set goals, and stay consistent with XP rewards.</p>
        </div>

      </section>

      {/* CTA */}
      <section className="demo-cta">
        <h2>Ready to Try Glide+?</h2>
        <p>Create your free account and start leveling up your student life.</p>

        <div className="demo-cta-actions">
          <Link to="/signup" className="demo-btn-primary">Get Started</Link>
          <Link to="/" className="demo-btn-secondary">Back Home</Link>
        </div>
      </section>

    </div>
  );
}