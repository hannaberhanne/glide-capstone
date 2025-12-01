import { Link } from "react-router-dom";
import "./SettingsPage.css";

export default function SettingsPage() {
  return (
    <div className="settings-container">
      <h1 className="settings-title">Settings</h1>
      <p className="settings-sub">
        Manage your Glide+ preferences and connected services.
      </p>

      <div className="settings-sections">

        {/* ⭐ CANVAS SYNC SECTION */}
        <div className="settings-card">
          <h2 className="settings-card-title">Canvas Sync</h2>
          <p className="settings-card-desc">
            Connect your Canvas account to automatically sync assignments,
            deadlines, and course information.
          </p>

          <Link to="/canvas-setup" className="settings-btn">
            Open Canvas Sync Setup →
          </Link>
        </div>

        {/* ⭐ ACCESSIBILITY SECTION (empty for now) */}
        <div className="settings-card">
          <h2 className="settings-card-title">Accessibility</h2>
          <p className="settings-card-desc">
            Customize accessibility preferences and display options.
          </p>

          <button className="settings-btn disabled">
            Coming Soon
          </button>
        </div>

        {/* ⭐ EDIT PROFILE SECTION (empty for now) */}
        <div className="settings-card">
          <h2 className="settings-card-title">Edit Profile</h2>
          <p className="settings-card-desc">
            Update your personal information and account details.
          </p>

          <button className="settings-btn disabled">
            Coming Soon
          </button>
        </div>

      </div>
    </div>
  );
}
