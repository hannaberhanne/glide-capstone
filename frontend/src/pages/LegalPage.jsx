import { Link } from "react-router-dom";
import AuthLogo from "../components/AuthLogo.jsx";
import "./LegalPage.css";

const updatedDate = "May 5, 2026";

export function PrivacyPage() {
  return (
    <main className="legal-page">
      <section className="legal-card">
        <div className="legal-head">
          <AuthLogo />
          <p className="legal-kicker">Privacy Policy</p>
          <h1>Privacy Policy</h1>
          <p>Last updated {updatedDate}</p>
        </div>

        <div className="legal-body">
          <section>
            <h2>What Glide+ Collects</h2>
            <p>
              Glide+ collects account details, profile information, tasks, goals, schedule blocks,
              courses, assignments, notification preferences, and onboarding answers you choose to
              provide. If you connect Canvas, Glide+ stores connection status and synced course or
              assignment data needed to power planning features.
            </p>
          </section>

          <section>
            <h2>Canvas Data</h2>
            <p>
              Canvas access tokens are used to import assignments, deadlines, and course information.
              Synced Canvas items may become Glide+ tasks so they can appear in the dashboard,
              planner, and goal workflows. You can disconnect Canvas from the app settings.
            </p>
          </section>

          <section>
            <h2>AI Planning</h2>
            <p>
              Glide+ may send sanitized task, goal, assignment, and schedule context to AI services
              to generate task suggestions, assignment extraction, XP estimates, and daily plans.
              The app does not intentionally send passwords or Canvas access tokens to AI prompts.
            </p>
          </section>

          <section>
            <h2>Notifications</h2>
            <p>
              If you enable notifications, Glide+ stores notification preferences and browser device
              registration details so it can prepare reminders about plans, due dates, missed blocks,
              streak risks, or replans.
            </p>
          </section>

          <section>
            <h2>How Data Is Used</h2>
            <p>
              Data is used to authenticate your account, sync school work, generate schedules,
              track progress, award XP, send requested notifications, and improve the app experience.
              Glide+ does not sell personal data.
            </p>
          </section>

          <section>
            <h2>Data Choices</h2>
            <p>
              You can update profile details, notification preferences, and Canvas connection status
              inside Glide+. Disconnecting Canvas stops future Canvas syncs; removing synced data is
              available where the app exposes that action.
            </p>
          </section>
        </div>

        <footer className="legal-return">
          <Link to="/">Back to Glide+</Link>
          <Link to="/terms">Terms</Link>
        </footer>
      </section>
    </main>
  );
}

export function TermsPage() {
  return (
    <main className="legal-page">
      <section className="legal-card">
        <div className="legal-head">
          <AuthLogo />
          <p className="legal-kicker">Terms</p>
          <h1>Terms of Use</h1>
          <p>Last updated {updatedDate}</p>
        </div>

        <div className="legal-body">
          <section>
            <h2>Using Glide+</h2>
            <p>
              Glide+ is a student productivity app for organizing tasks, goals, schedules, Canvas
              work, reminders, and progress. You are responsible for the accuracy of information you
              enter and for reviewing plans before relying on them.
            </p>
          </section>

          <section>
            <h2>Accounts</h2>
            <p>
              You must keep your login credentials secure and use your own account. You are
              responsible for activity that occurs under your account.
            </p>
          </section>

          <section>
            <h2>Canvas Sync</h2>
            <p>
              If you connect Canvas, you authorize Glide+ to use your token to retrieve course and
              assignment information for your account. You can disconnect Canvas from the app.
            </p>
          </section>

          <section>
            <h2>AI Output</h2>
            <p>
              AI-generated schedules, suggestions, XP estimates, and extracted assignment details may
              be incomplete or incorrect. Treat them as planning assistance, not as academic,
              professional, medical, legal, or financial advice.
            </p>
          </section>

          <section>
            <h2>Acceptable Use</h2>
            <p>
              Do not misuse Glide+, attempt to access another person&apos;s data, interfere with the
              service, upload harmful content, or use the app in a way that violates school policies
              or applicable law.
            </p>
          </section>

          <section>
            <h2>Availability</h2>
            <p>
              Glide+ may change, pause, or remove features. The app is provided as-is, and we do not
              guarantee that plans, reminders, syncs, or notifications will always be available or
              error-free.
            </p>
          </section>
        </div>

        <footer className="legal-return">
          <Link to="/">Back to Glide+</Link>
          <Link to="/privacy">Privacy</Link>
        </footer>
      </section>
    </main>
  );
}
