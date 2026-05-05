import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AccessibilityMenu from "../components/AccessibilityMenu.jsx";
import "./LandingPage.css";

function LandingLogo({ light = false }) {
  const fill = light ? "#FAF7F2" : "var(--glide-ink)";
  return (
    <svg width="100" height="44" viewBox="0 0 130 70" fill="none" aria-label="Glide+">
      <text x="0" y="44" fontFamily="Libre Baskerville,serif" fontStyle="italic" fontWeight="700" fontSize="44" fill={fill}>G</text>
      <text x="31" y="44" fontFamily="Libre Baskerville,serif" fontWeight="400" fontSize="35" fill={fill}>lide</text>
      <text x="88" y="38" fontFamily="Libre Baskerville,serif" fontWeight="700" fontSize="18" fill="var(--achievement-color)">+</text>
      <g transform="translate(31,48) rotate(-7)">
        <path d="M2 4 Q4 1.5 8 2 L62 1.5 Q68 1 71 3.5 L71 8 Q68 10 62 9.5 L8 10 Q4 10.5 2 8 Z" fill={fill} />
        <rect x="5" y="9.5" width="9" height="2.2" rx="1.1" fill="#6B5E54" />
        <circle cx="7" cy="15.5" r="5" fill="var(--achievement-color)" />
        <circle cx="7" cy="15.5" r="2.4" fill="#FAF7F2" />
        <circle cx="17" cy="15" r="5" fill="var(--achievement-color)" />
        <circle cx="17" cy="15" r="2.4" fill="#FAF7F2" />
        <rect x="58" y="8.2" width="9" height="2.2" rx="1.1" fill="#6B5E54" />
        <circle cx="60" cy="14" r="5" fill="var(--achievement-color)" />
        <circle cx="60" cy="14" r="2.4" fill="#FAF7F2" />
        <circle cx="70" cy="13.5" r="5" fill="var(--achievement-color)" />
        <circle cx="70" cy="13.5" r="2.4" fill="#FAF7F2" />
      </g>
    </svg>
  );
}

function MiniPreview({ mode }) {
  if (mode === "sync") {
    return (
      <div className="mini-preview">
        <span>Canvas</span>
        <p>Research brief · Friday</p>
        <p>Problem set · Sunday</p>
        <strong>Ready to plan</strong>
      </div>
    );
  }

  if (mode === "plan") {
    return (
      <div className="mini-preview">
        <span>Today</span>
        <p>10:00 Research brief</p>
        <p>1:30 Problem set</p>
        <strong>Built around priority</strong>
      </div>
    );
  }

  return (
    <div className="mini-preview">
      <span>Momentum</span>
      <p>Portfolio · 3/5</p>
      <p>4 day streak</p>
      <strong>Progress stays visible</strong>
    </div>
  );
}

export default function LandingPage() {
  const year = new Date().getFullYear();
  const [activeStep, setActiveStep] = useState("plan");
  const [stepPaused, setStepPaused] = useState(false);
  const [activeNote, setActiveNote] = useState(0);
  const steps = useMemo(
    () => [
      {
        id: "sync",
        title: "Sync",
        body: "Bring Canvas assignments, courses, and deadlines into Glide+.",
      },
      {
        id: "plan",
        title: "Plan",
        body: "Build a day from deadlines, priority, available time, and energy.",
      },
      {
        id: "progress",
        title: "Progress",
        body: "Use goals, XP, streaks, and task completion to keep moving.",
      },
    ],
    []
  );
  const notes = useMemo(
    () => [
      {
        quote: "I need something that tells me where to start.",
        label: "Deadline week",
      },
      {
        quote: "Keeping track of school, work, and personal tasks in different places is where focus disappears.",
        label: "Work plus classes",
      },
      {
        quote: "A plan based on deadlines, priority, and energy would make starting feel less impossible.",
        label: "Low-energy afternoon",
      },
    ],
    []
  );

  useEffect(() => {
    if (stepPaused) return undefined;

    const interval = window.setInterval(() => {
      setActiveStep((current) => {
        const currentIndex = steps.findIndex((step) => step.id === current);
        return steps[(currentIndex + 1) % steps.length].id;
      });
    }, 3400);

    return () => window.clearInterval(interval);
  }, [stepPaused, steps]);

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="nav-container">
          <Link to="/" className="landing-logo" aria-label="Glide+ home">
            <LandingLogo light />
          </Link>
          <div className="nav-right">
            <Link to="/login" className="nav-login">Log in</Link>
            <Link to="/signup" className="nav-signup">Sign up</Link>
          </div>
        </div>
      </header>

      <div className="landing-accessibility">
        <AccessibilityMenu />
      </div>

      <section className="hero">
        <video autoPlay muted loop playsInline className="hero-video">
          <source src="/videos/skate-hero.mp4" type="video/mp4" />
        </video>
        <div className="hero-content">
          <h1 className="hero-title">Your student life, intelligently organized.</h1>
          <p className="hero-subtitle">
            Canvas work, goals, and daily planning in one student workspace built for the days that keep changing.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn-primary">Get started</Link>
            <Link to="/demo" className="btn-secondary">View demo</Link>
          </div>
        </div>
      </section>

      <div className="landing-breath" aria-hidden />

      <section className="how-section">
        <div className="landing-section-head">
          <p className="section-heading">How Glide+ works</p>
          <h2 className="how-section-heading">Everything in one place.</h2>
        </div>
        <div
          className="step-cards"
          onMouseEnter={() => setStepPaused(true)}
          onMouseLeave={() => setStepPaused(false)}
          onFocus={() => setStepPaused(true)}
          onBlur={() => setStepPaused(false)}
        >
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className={`step-card ${activeStep === step.id ? "is-active" : ""}`.trim()}
              onClick={() => setActiveStep(step.id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.title}</strong>
              <em>{step.body}</em>
              {activeStep === step.id ? <MiniPreview mode={step.id} /> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="product-section">
        <article className="product-row">
          <div className="product-copy">
            <p className="section-heading">Dashboard</p>
            <h2>Your day, at a glance.</h2>
            <p>See today&apos;s work, upcoming tasks, progress, and loose ends without opening five different tabs.</p>
            <ul>
              <li>Today and upcoming task states</li>
              <li>XP progress and streak rhythm</li>
              <li>Quick notes beside the work</li>
            </ul>
          </div>
          <div className="product-mock product-mock--dashboard" aria-hidden>
            <div className="mock-sheet">
              <span>Today</span>
              <p>Complete assignment</p>
              <p>Read chapter 7</p>
              <p>Draft project outline</p>
              <span className="mock-subhead">Upcoming</span>
              <p>Problem set · Friday</p>
              <p>Canvas quiz · Sunday</p>
            </div>
            <div className="mock-rail">
              <i />
              <strong>May</strong>
              <div />
            </div>
          </div>
        </article>

        <article className="product-row product-row--reverse">
          <div className="product-copy">
            <p className="section-heading">Planner</p>
            <h2>AI that understands your context.</h2>
            <p>Generate a realistic day from Canvas deadlines, unscheduled work, priority, time, and energy.</p>
            <ul>
              <li>Real schedule generation</li>
              <li>Manual replan when priorities change</li>
              <li>Calendar view with unscheduled tasks</li>
            </ul>
          </div>
          <div className="product-mock product-mock--planner" aria-hidden>
            {Array.from({ length: 21 }).map((_, index) => (
              <span key={index} className={index === 9 ? "is-selected" : ""}>
                {index + 1}
                {index === 9 ? (
                  <em>
                    <b>1 scheduled</b>
                    Complete assignment
                  </em>
                ) : null}
              </span>
            ))}
          </div>
        </article>

        <article className="product-row">
          <div className="product-copy">
            <p className="section-heading">Goals</p>
            <h2>Turn progress into momentum.</h2>
            <p>Build routines and projects into visible tasks, streaks, badges, and XP without making the app feel childish.</p>
            <ul>
              <li>Routine and project goals</li>
              <li>Streaks, badges, and level progress</li>
              <li>Goal-linked tasks that reset correctly</li>
            </ul>
          </div>
          <div className="product-mock product-mock--goals" aria-hidden>
            <div className="goal-mock-card is-red">
              <strong>Become a pro skater</strong>
              <i><span style={{ width: "42%" }} /></i>
              <p>2 of 5 tasks complete</p>
            </div>
            <div className="goal-mock-card is-gold">
              <strong>Learn to play chess</strong>
              <i><span style={{ width: "72%" }} /></i>
              <p>4 day streak</p>
            </div>
            <div className="goal-mock-badges">
              <span>Dream Big</span>
              <span>Week Warrior</span>
              <span>Rising</span>
            </div>
          </div>
        </article>
      </section>

      <section className="student-notes">
        <div className="notes-layout">
          <p className="section-heading">Student notes</p>
          <h2 className="notes-title">What students told us.</h2>
          <div className="notes-carousel" aria-live="polite">
            <button
              type="button"
              className="notes-arrow"
              onClick={() => setActiveNote((activeNote + notes.length - 1) % notes.length)}
              aria-label="Previous note"
            >
              ‹
            </button>
            <div className="notes-viewport">
              <div
                className="notes-track"
                style={{ "--note-index": activeNote }}
              >
                {notes.map((note, index) => (
                  <article
                    key={note.label}
                    className={`notes-card ${index === activeNote ? "is-active" : ""}`.trim()}
                  >
                    <p>&ldquo;{note.quote}&rdquo;</p>
                    <span>{note.label}</span>
                  </article>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="notes-arrow"
              onClick={() => setActiveNote((activeNote + 1) % notes.length)}
              aria-label="Next note"
            >
              ›
            </button>
          </div>
          <div className="notes-dots" aria-label="Student note controls">
            {notes.map((note, index) => (
              <button
                key={note.label}
                type="button"
                className={index === activeNote ? "is-active" : ""}
                onClick={() => setActiveNote(index)}
                aria-label={`Show note ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-heading">Start with today.</h2>
          <p className="cta-subtext">
            Bring the work into one place, generate the next move, and keep going from there.
          </p>
          <Link to="/signup" className="cta-button">Get started</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <LandingLogo />
            <p>Student planning, goals, and Canvas sync in one workspace.</p>
          </div>
          <nav className="landing-footer-links" aria-label="Footer">
            <Link to="/demo">Demo</Link>
            <Link to="/login">Log in</Link>
            <Link to="/signup">Sign up</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
        </div>
        <div className="landing-footer-bottom">
          <p>© {year} Glide+ · v1.0.0</p>
        </div>
      </footer>
    </div>
  );
}
