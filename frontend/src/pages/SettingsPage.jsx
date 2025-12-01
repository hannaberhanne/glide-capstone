import { Link, useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import "./SettingsPage.css";

export default function SettingsPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="settings-container">
      <h1 className="settings-title">Profile</h1>
      <p className="settings-sub">
        Manage your account and connected services without clutter.
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

        <div className="settings-card subtle">
          <h2 className="settings-card-title">Session</h2>
          <p className="settings-card-desc">Signed in as {auth.currentUser?.email || "user"}.</p>
          <button className="settings-link" onClick={handleLogout}>
            Log out
          </button>
        </div>

      </div>
    </div>
  );
}
