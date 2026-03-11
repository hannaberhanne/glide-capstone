import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import useCanvasStatus from "../hooks/useCanvasStatus";
import useUser from "../hooks/useUser";
import PixelIcon from "../components/PixelIcon.jsx";
import "./SettingsPage.css";

const OVERRIDE_PATTERNS = {
  academic: "academic",
  health: "health",
  personal: "personal",
};

const resolvePattern = (major, canvasCategory) => {
  const guess = (text) => {
    if (!text) return null;
    const lower = text.toLowerCase();
    if (lower.includes("health")) return "health";
    if (
      lower.includes("science") ||
      lower.includes("math") ||
      lower.includes("engineering")
    ) {
      return "academic";
    }
    if (lower.includes("art") || lower.includes("design")) return "personal";
    return null;
  };

  return guess(major) || OVERRIDE_PATTERNS[canvasCategory] || "default";
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

  const { user, xp, refreshUser } = useUser(API_URL);
  const { canvasStatus } = useCanvasStatus(API_URL);

  const userRecord = Array.isArray(user) ? user[0] : user;

  const displayName =
    userRecord?.firstName ||
    auth.currentUser?.displayName?.split(" ")[0] ||
    "User";

  const canvasConnected = !!canvasStatus?.hasToken;

  const [activeTab, setActiveTab] = useState("general");
  const [form, setForm] = useState({
    firstName: userRecord?.firstName || "",
    lastName: userRecord?.lastName || "",
    email: auth.currentUser?.email || "",
    password: "",
    hometown: userRecord?.hometown || "",
    university: userRecord?.university || "",
    year: userRecord?.year || "",
    major: userRecord?.major || "",
    timezone: userRecord?.timezone || "",
  });

  const [prefs, setPrefs] = useState({
    notifications: userRecord?.notification || false,
    weeklySummary: userRecord?.weeklySummary || false,
  });

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const avatarPattern = useMemo(
    () => resolvePattern(form.major, userRecord?.category),
    [form.major, userRecord?.category]
  );

  useEffect(() => {
    setForm({
      firstName: userRecord?.firstName || "",
      lastName: userRecord?.lastName || "",
      email: auth.currentUser?.email || "",
      password: "",
      hometown: userRecord?.hometown || "",
      university: userRecord?.university || "",
      year: userRecord?.year || "",
      major: userRecord?.major || "",
      timezone: userRecord?.timezone || "",
    });

    setPrefs({
      notifications: userRecord?.notification || false,
      weeklySummary: userRecord?.weeklySummary || false,
    });
  }, [userRecord]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const togglePref = (field) => {
    setPrefs((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const resetForm = () => {
    setForm({
      firstName: userRecord?.firstName || "",
      lastName: userRecord?.lastName || "",
      email: auth.currentUser?.email || "",
      password: "",
      hometown: userRecord?.hometown || "",
      university: userRecord?.university || "",
      year: userRecord?.year || "",
      major: userRecord?.major || "",
      timezone: userRecord?.timezone || "",
    });

    setPrefs({
      notifications: userRecord?.notification || false,
      weeklySummary: userRecord?.weeklySummary || false,
    });

    setStatusMessage("");
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    if (!auth.currentUser) return;

    setSaving(true);
    setStatusMessage("");

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        hometown: form.hometown.trim(),
        university: form.university.trim(),
        year: form.year.trim(),
        major: form.major.trim(),
        timezone: form.timezone.trim(),
        preferences: { ...prefs },
      };

      const token = await auth.currentUser.getIdToken();

      const res = await fetch(`${API_URL}/api/users/${auth.currentUser.uid}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      setStatusMessage("Profile updated");
      refreshUser();
    } catch (err) {
      console.error("Profile update failed:", err);
      setStatusMessage("Unable to save changes right now.");
    } finally {
      setSaving(false);
    }
  };

  const renderTabContent = () => {
    if (activeTab === "general") {
      return (
        <section className="settings-panel">
          <div className="settings-panel-header">
            <div className="settings-panel-avatar">
              <PixelIcon pattern={avatarPattern} />
            </div>
            <div>
              <h1 className="settings-panel-title">{displayName}</h1>
              <p className="settings-panel-subtitle">
                Manage your core profile information.
              </p>
            </div>
          </div>

          <form className="settings-form" onSubmit={handleProfileSave}>
            <div className="settings-form-grid">
              <label>
                First Name
                <input
                  className="settings-input"
                  value={form.firstName}
                  onChange={(e) => updateFormField("firstName", e.target.value)}
                  placeholder="First name"
                />
              </label>

              <label>
                Last Name
                <input
                  className="settings-input"
                  value={form.lastName}
                  onChange={(e) => updateFormField("lastName", e.target.value)}
                  placeholder="Last name"
                />
              </label>

              <label className="settings-field-full">
                Email
                <input
                  className="settings-input"
                  value={form.email}
                  onChange={(e) => updateFormField("email", e.target.value)}
                  placeholder="Email"
                  type="email"
                />
              </label>

              <label className="settings-field-full">
                Password
                <input
                  className="settings-input"
                  value={form.password}
                  onChange={(e) => updateFormField("password", e.target.value)}
                  placeholder="Enter new password"
                  type="password"
                />
              </label>

              <label className="settings-field-full">
                Home Town
                <input
                  className="settings-input"
                  value={form.hometown}
                  onChange={(e) => updateFormField("hometown", e.target.value)}
                  placeholder="Home town"
                />
              </label>
            </div>

            <div className="settings-form-actions">
              <button className="settings-btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                className="settings-link"
                type="button"
                onClick={resetForm}
              >
              {/* Reset */}
              </button>
            </div>

            {statusMessage && <p className="settings-status">{statusMessage}</p>}
          </form>
        </section>
      );
    }

    if (activeTab === "progress") {
      return (
        <section className="settings-panel">
          <div className="settings-panel-header">
            <div>
              <h1 className="settings-panel-title">Progress</h1>
              <p className="settings-panel-subtitle">
                Track your performance and achievements.
              </p>
            </div>
          </div>

          <div className="progress-grid">
            <article className="settings-stat-card">
              <p className="settings-stat-label">Current XP</p>
              <p className="settings-stat-value">{xp?.toLocaleString() ?? 0}</p>
            </article>

            <article className="settings-stat-card">
              <p className="settings-stat-label">Level</p>
              <p className="settings-stat-value">{userRecord?.level ?? 1}</p>
            </article>

            <article className="settings-stat-card">
              <p className="settings-stat-label">Longest Streak</p>
              <p className="settings-stat-value">
                {userRecord?.longestStreak ?? 0} days
              </p>
            </article>

            <article className="settings-stat-card">
              <p className="settings-stat-label">Tasks Completed</p>
              <p className="settings-stat-value">
                {userRecord?.tasksCompleted ?? 0}
              </p>
            </article>
          </div>

          <div className="settings-section">
            <h2 className="settings-section-title">Badges</h2>
            <div className="badge-grid">
              {(userRecord?.badges?.length ? userRecord.badges : [
                "No badges unlocked yet",
              ]).map((badge, index) => (
                <div className="badge-card" key={index}>
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === "preferences") {
      return (
        <section className="settings-panel">
          <div className="settings-panel-header">
            <div>
              <h1 className="settings-panel-title">Preferences</h1>
              <p className="settings-panel-subtitle">
                Customize how Glide+ feels day to day.
              </p>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-section-title">Notifications</h2>
            <div className="settings-toggles">
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={prefs.notifications}
                  onChange={() => togglePref("notifications")}
                />
                <span>Receive task reminders</span>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={prefs.weeklySummary}
                  onChange={() => togglePref("weeklySummary")}
                />
                <span>Weekly progress summary</span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-section-title">Appearance</h2>
            <p className="settings-muted-text">
              Dark mode, color controls, and accessibility options can be added
              here next.
            </p>
          </div>
        </section>
      );
    }

    if (activeTab === "student") {
      return (
        <section className="settings-panel">
          <div className="settings-panel-header">
            <div>
              <h1 className="settings-panel-title">Student</h1>
              <p className="settings-panel-subtitle">
                Manage your academic profile and Canvas connection.
              </p>
            </div>
          </div>

          <form className="settings-form" onSubmit={handleProfileSave}>
            <div className="student-grid">
              <article className="settings-info-card">
                <h2 className="settings-section-title">Academic Info</h2>

                <div className="settings-form-grid">
                  <label className="settings-field-full">
                    University
                    <input
                      className="settings-input"
                      value={form.university}
                      onChange={(e) =>
                        updateFormField("university", e.target.value)
                      }
                      placeholder="University"
                    />
                  </label>

                  <label>
                    Year
                    <input
                      className="settings-input"
                      value={form.year}
                      onChange={(e) => updateFormField("year", e.target.value)}
                      placeholder="Senior, Junior, etc."
                    />
                  </label>

                  <label>
                    Major
                    <input
                      className="settings-input"
                      value={form.major}
                      onChange={(e) => updateFormField("major", e.target.value)}
                      placeholder="Major"
                    />
                  </label>
                </div>
              </article>

              <article className="settings-info-card">
                <h2 className="settings-section-title">Canvas Sync</h2>

                <div className="settings-info-list">
                  <div>
                    <span className="settings-info-label">Status</span>
                    <p>{canvasConnected ? "Connected" : "Offline"}</p>
                  </div>

                  <div>
                    <span className="settings-info-label">Connection</span>
                    <p>
                      {canvasConnected
                        ? "Your Canvas account is linked."
                        : "Connect Canvas to import assignments and deadlines."}
                    </p>
                  </div>
                </div>

                <Link to="/canvas-setup" className="settings-btn inline-btn">
                  {canvasConnected ? "Manage Connection" : "Connect Canvas"}
                </Link>
              </article>
            </div>

            <div className="settings-form-actions">
              <button className="settings-btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                className="settings-link"
                type="button"
                onClick={resetForm}
              >
                {/* Reset */}
              </button>
            </div>

            {statusMessage && <p className="settings-status">{statusMessage}</p>}
          </form>
        </section>
      );
    }

    return null;
  };

  return (
    <div className="settings-layout">
      <aside className="settings-sidebar">
        <p className="settings-sidebar-title">Settings</p>

        <button
          className={`settings-sidebar-item ${
            activeTab === "general" ? "active" : ""
          }`}
          onClick={() => setActiveTab("general")}
          type="button"
        >
          General
        </button>

        <button
          className={`settings-sidebar-item ${
            activeTab === "progress" ? "active" : ""
          }`}
          onClick={() => setActiveTab("progress")}
          type="button"
        >
          Progress
        </button>

        <button
          className={`settings-sidebar-item ${
            activeTab === "preferences" ? "active" : ""
          }`}
          onClick={() => setActiveTab("preferences")}
          type="button"
        >
          Preferences
        </button>

        <button
          className={`settings-sidebar-item ${
            activeTab === "student" ? "active" : ""
          }`}
          onClick={() => setActiveTab("student")}
          type="button"
        >
          Student
        </button>

        <div className="settings-sidebar-bottom">
          <button
            className="settings-sidebar-item logout"
            onClick={handleLogout}
            type="button"
          >
            Log Out
          </button>
        </div>
      </aside>

      <main className="settings-content">{renderTabContent()}</main>
    </div>
  );
}