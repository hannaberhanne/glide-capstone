import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  const year = new Date().getFullYear();

  const slides = [
    { title: "Dashboard", text: "Weekly overview of classes, work, and priorities." },
    { title: "Planner & Calendar Sync", text: "Smart schedule that auto-adjusts when life changes." },
    { title: "Habits & XP", text: "Turn habits into quests, earn XP, and keep streaks alive." },
  ];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setCurrent((prev) => (prev + 1) % slides.length),
      3500
    );
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="landing-page">

      {/* ===== NAVBAR ===== */}
      <header className="landing-header">
        <div className="nav-container">
          <div className="nav-left">
            <div className="landing-logo">
  <svg width="100" height="44" viewBox="0 0 130 70" fill="none">
    <text x="0" y="44" fontFamily="Libre Baskerville,serif" fontStyle="italic" fontWeight="700" fontSize="44" fill="#FAF7F2">G</text>
    <text x="31" y="44" fontFamily="Libre Baskerville,serif" fontWeight="400" fontSize="35" fill="#FAF7F2">lide</text>
    <text x="88" y="38" fontFamily="Libre Baskerville,serif" fontWeight="700" fontSize="18" fill="var(--achievement-color)">+</text>
    <g transform="translate(31,48) rotate(-7)">
      <path d="M2 4 Q4 1.5 8 2 L62 1.5 Q68 1 71 3.5 L71 8 Q68 10 62 9.5 L8 10 Q4 10.5 2 8 Z" fill="#FAF7F2"/>
      <rect x="5" y="9.5" width="9" height="2.2" rx="1.1" fill="#6B5E54"/>
      <circle cx="7"  cy="15.5" r="5"   fill="var(--achievement-color)"/>
      <circle cx="7"  cy="15.5" r="2.4" fill="#FAF7F2"/>
      <circle cx="17" cy="15"   r="5"   fill="var(--achievement-color)"/>
      <circle cx="17" cy="15"   r="2.4" fill="#FAF7F2"/>
      <rect x="58" y="8.2" width="9" height="2.2" rx="1.1" fill="#6B5E54"/>
      <circle cx="60" cy="14"   r="5"   fill="var(--achievement-color)"/>
      <circle cx="60" cy="14"   r="2.4" fill="#FAF7F2"/>
      <circle cx="70" cy="13.5" r="5"   fill="var(--achievement-color)"/>
      <circle cx="70" cy="13.5" r="2.4" fill="#FAF7F2"/>
    </g>
  </svg>
</div>
          </div>
          <div className="nav-right">
            <Link to="/login" className="nav-login">LOG IN</Link>
            <Link to="/signup" className="nav-signup">SIGN UP</Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
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

      {/* ===== CAROUSEL ===== */}
      <section className="carousel-section">
        <h3 className="section-heading">See How Glide+ Works</h3>
        <div className="carousel-container">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`carousel-item ${index === current ? "active" : "inactive"}`}
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
