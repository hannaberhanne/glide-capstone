import "./DemoPage.css";
import { Link } from "react-router-dom";

export default function DemoPage() {
  const year = new Date().getFullYear();

  return (
    <div className="demo-page">
      <header className="demo-header">
        <Link to="/" className="demo-logo" aria-label="Glide+ home">
          Glide<span>+</span>
        </Link>

        <nav className="demo-nav" aria-label="Demo navigation">
          <Link to="/">Home</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Sign up</Link>
        </nav>
      </header>

      <main className="demo-main">
        <section className="demo-hero">
          <p className="demo-kicker">Product Demo</p>
          <h1>Glide+ Preview</h1>
          <p>
            A quick look at the core workspace: today&apos;s plan, monthly planning, and goal progress.
          </p>
        </section>

        <section className="demo-showcase" aria-label="Glide+ feature previews">
          <article className="demo-panel demo-panel--home">
            <div className="demo-panel-copy">
              <p className="demo-kicker">Home</p>
              <h2>Today stays scannable.</h2>
              <p>Tasks, XP, streak context, and quick notes live in one calm workspace.</p>
            </div>
            <div className="demo-window demo-home-preview" aria-hidden>
              <div className="demo-window-head">
                <span>Today</span>
                <span>Tuesday, May 5</span>
              </div>
              <div className="demo-task-row is-strong">
                <span />
                <div>
                  <strong>Complete assignment</strong>
                  <small>Academic · Today</small>
                </div>
              </div>
              <div className="demo-task-row">
                <span />
                <div>
                  <strong>Review planner</strong>
                  <small>Planning · Upcoming</small>
                </div>
              </div>
              <div className="demo-note">Ideas, reminders, loose ends.</div>
            </div>
          </article>

          <article className="demo-panel demo-panel--planner">
            <div className="demo-panel-copy">
              <p className="demo-kicker">Planner</p>
              <h2>Work moves into the month.</h2>
              <p>Unscheduled tasks sit beside a calendar built for dragging, replanning, and review.</p>
            </div>
            <div className="demo-window demo-planner-preview" aria-hidden>
              <div className="demo-backlog">
                <span>Unscheduled</span>
                <div />
                <div />
                <div />
              </div>
              <div className="demo-month">
                {Array.from({ length: 20 }, (_, index) => (
                  <span key={index} className={index === 7 ? "is-selected" : ""}>
                    {index + 1}
                  </span>
                ))}
              </div>
            </div>
          </article>

          <article className="demo-panel demo-panel--goals">
            <div className="demo-panel-copy">
              <p className="demo-kicker">Goals</p>
              <h2>Progress has texture.</h2>
              <p>Goal cards show task completion, streaks, badges, and XP without leaving the page.</p>
            </div>
            <div className="demo-window demo-goals-preview" aria-hidden>
              <div className="demo-goal-card is-red">
                <strong>Skater</strong>
                <span />
                <p>3 tasks · 0/3 today</p>
              </div>
              <div className="demo-goal-card is-gold">
                <strong>Become a chef</strong>
                <span />
                <p>3 tasks · 0/3 today</p>
              </div>
              <div className="demo-badge-rail">
                <span>Badges</span>
                <div />
                <div />
                <div />
              </div>
            </div>
          </article>
        </section>
      </main>

      <footer className="demo-footer">
        <p>© {year} Glide+</p>
        <nav aria-label="Demo footer">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
      </footer>
    </div>
  );
}
