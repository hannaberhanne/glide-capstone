import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  const year = new Date().getFullYear();

  // Carousel logic
  const slides = [
    {
      title: "Dashboard",
      text: "Weekly overview of classes, work, and priorities.",
    },
    {
      title: "Planner & Calendar Sync",
      text: "Smart schedule that auto-adjusts when life changes.",
    },
    {
      title: "Habits & XP",
      text: "Turn habits into quests, earn XP, and keep streaks alive.",
    },
  ];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setCurrent((prev) => (prev + 1) % slides.length),
      3500
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-page">

      {/* ===== NAVBAR ===== */}
      <header className="landing-header">
  <div className="nav-container">
    <div className="nav-left">
      <div className="landing-logo">
        <span className="logo-text">Glide</span>
        <span className="logo-plus">+</span>
      </div>
    </div>

    <div className="nav-right">
      <Link to="/login" className="nav-login">LOG IN</Link>
      <Link to="/signup" className="nav-signup">SIGN UP</Link>
    </div>
  </div>
</header>
<section className="hero">
  <video autoPlay muted loop playsInline className="hero-video">
    <source src="/videos/skate-hero.mp4" type="video/mp4" />
  </video>


  <div className="hero-content">
    <p className="hero-eyebrow">GLIDE+</p>
    <h1 className="hero-title">YOUR JOURNEY STARTS HERE</h1>
    <p className="hero-subtitle">
      All your goals, tasks, and habits in one AI-powered space synced with your calendar — built to adapt to your student life.
    </p>

    <div className="hero-actions">
      <Link to="/login" className="btn-primary">Get Started</Link>
      <Link to="/demo" className="btn-secondary">View Demo</Link>
    </div>
  </div>
</section>

      {/* ===== CAROUSEL (auto switch) ===== */}
      <section className="carousel-section">
        <h3 className="section-heading">See How Glide+ Works</h3>
        <div className="carousel-container">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`carousel-item ${
                index === current ? "active" : "inactive"
              }`}
            >
              <h4>{slide.title}</h4>
              <p>{slide.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SUBHEADLINE ===== */}
      <section className="subheadline-section">
        <h2>ALL YOUR GOALS, TASKS, AND HABITS IN ONE SMART PLACE</h2>
        <p>Powered by AI. Synced with your calendar. Built for YOU.</p>
      </section>

      {/* ===== FEATURES ===== */}
<section className="features-section">
  <h3 className="section-heading">Everything You Need In One Platform</h3>

  <div className="feature-grid">
    {/* AI Task Planner */}
    <Link to="/planner" className="feature-card">
      <div className="feature-content">
        <h4>AI Task Planner</h4>
        <p>Upload syllabi or assignments and let Glide+ create your adaptive plan.</p>
      </div>
      <div className="feature-arrow">→</div>
    </Link>

    {/* Smart Calendar Sync */}
    <Link to="/dashboard" className="feature-card">
      <div className="feature-icon">
        {/* Calendar icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
      <div className="feature-content">
        <h4>Smart Calendar Sync</h4>
        <p>Connect your calendars to avoid conflicts and auto-block study time.</p>
      </div>
      <div className="feature-arrow">→</div>
    </Link>

    {/* Habit & Goal Tracking */}
    <Link to="/dashboard" className="feature-card">
      <div className="feature-content">
        <h4>Habit & Goal Tracking</h4>
        <p>Track habits, earn XP, and stay consistent without burning out.</p>
      </div>
      <div className="feature-arrow">→</div>
    </Link>
  </div>
</section>

      {/* ===== CTA ===== */}
<section className="cta-section">
  <div className="cta-content">
    <h2 className="cta-heading">
      Join thousands of students <br /> organizing their goals with <span>Glide+</span>
    </h2>
    <p className="cta-subtext">
      All your tasks, habits, and goals — powered by AI to keep your student life balanced.
    </p>
    <Link to="/login" className="cta-button">
      Get Started
    </Link>
  </div>
</section>

      {/* ===== FOOTER ===== */}
      <footer className="landing-footer">
        <p>© {year} Glide+. All rights reserved.</p>
      </footer>
    </div>
  );
}