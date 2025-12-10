import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiShield } from "react-icons/fi";
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
    if (lower.includes("science") || lower.includes("math") || lower.includes("engineering")) return "academic";
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
  const [form, setForm] = useState({
    firstName: userRecord?.firstName || "",
    lastName: userRecord?.lastName || "",
    email: auth.currentUser?.email || "",
    university: userRecord?.university || "",
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
      university: userRecord?.university || "",
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
    setForm((prev) => ({
      ...prev,
      firstName: userRecord?.firstName || "",
      lastName: userRecord?.lastName || "",
      email: auth.currentUser?.email || "",
      university: userRecord?.university || "",
      major: userRecord?.major || "",
      timezone: userRecord?.timezone || "",
    }));
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
        university: form.university.trim(),
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

  return (
    <div className="settings-container">
      <section className="settings-hero">
        <div className="settings-hero-profile">
          <div className="settings-avatar">
            <PixelIcon pattern={avatarPattern} />
          </div>
          <div>
            <p className="settings-hero-title">Welcome back, {displayName}</p>
            <p className="settings-hero-sub">
              Plan fast, earn XP, and keep Canvas in sync without missing a beat.
            </p>
            <div className="settings-hero-tags">
              <span className="settings-hero-tag">{form.university || "Glide University"}</span>
              <span className="settings-hero-tag">{form.major || "General major"}</span>
            </div>
          </div>
        </div>
        <div className="settings-hero-stats">
          <div>
            <p className="settings-hero-label">XP earned</p>
            <p className="settings-hero-value">{xp?.toLocaleString() ?? 0}</p>
          </div>
          <div>
            <p className="settings-hero-label">Longest streak</p>
            <p className="settings-hero-value">
              {userRecord?.longestStreak ?? "—"} days
            </p>
          </div>
          <div>
            <p className="settings-hero-label">Canvas sync</p>
            <p className="settings-hero-value">
              {canvasConnected ? "Connected" : "Offline"}
            </p>
          </div>
        </div>
      </section>

      <div className="settings-grid">
        <article className="settings-card profile-card">
          <div className="settings-card-headline">
            <h2>Your account</h2>
            <FiShield />
          </div>
          <form className="settings-form" onSubmit={handleProfileSave}>
            <div className="settings-form-grid">
              <label>
                First name
                <input
                  className="settings-input"
                  value={form.firstName}
                  onChange={(e) => updateFormField("firstName", e.target.value)}
                  placeholder="First name"
                />
              </label>
              <label>
                Last name
                <input
                  className="settings-input"
                  value={form.lastName}
                  onChange={(e) => updateFormField("lastName", e.target.value)}
                  placeholder="Last name"
                />
              </label>
              <label>
                Email
                <input
                  className="settings-input"
                  value={form.email}
                  onChange={(e) => updateFormField("email", e.target.value)}
                  placeholder="Email"
                  type="email"
                />
              </label>
              <label>
                University
                <input
                  className="settings-input"
                  value={form.university}
                  onChange={(e) => updateFormField("university", e.target.value)}
                  placeholder="University"
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
              <label>
                Timezone
                <input
                  className="settings-input"
                  value={form.timezone}
                  onChange={(e) => updateFormField("timezone", e.target.value)}
                  placeholder="Timezone"
                />
              </label>
            </div>
            <div className="settings-form-actions">
              <button className="settings-btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save profile"}
              </button>
              <button
                className="settings-link"
                type="button"
                onClick={resetForm}
              >
                Reset fields
              </button>
            </div>
            {statusMessage && <p className="settings-status">{statusMessage}</p>}
          </form>
          <p className="settings-card-note">
            Accessibility controls live in the floating gear at the bottom-right of every page.
          </p>
        </article>

        <article className="settings-card info-card">
          <div className="info-block">
            <div className="settings-card-headline">
              <h2>Canvas sync</h2>
              <span className={`pill ${canvasConnected ? "pill-success" : "pill-inactive"}`}>
                {canvasConnected ? "Live" : "Offline"}
              </span>
            </div>
            <p className="settings-card-desc">
              {canvasConnected
                ? "Canvas assignments, deadlines, and syllabi stay in sync automatically."
                : "Connect Canvas to import your tasks and unlock auto-tracking."}
            </p>
            <Link to="/canvas-setup" className="settings-btn inline-btn">
              {canvasConnected ? "Manage →" : "Connect →"}
            </Link>
          </div>
          <div className="info-block">
            <div className="settings-card-headline">
              <h2>Session</h2>
              <span className="pill pill-muted">Secure</span>
            </div>
            <p className="settings-card-desc">
              Signed in as {displayName}.
            </p>
            <button className="settings-link" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </article>

        <article className="settings-card preferences-card">
          <div className="settings-card-headline">
            <h2>Preferences</h2>
            <span className="pill">Customize</span>
          </div>
          <p className="settings-card-desc">
            Tweak notifications, summaries, and ambient reminders for your daily gamified flow.
          </p>
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
          <p className="settings-card-note">
            Accessibility controls stay in the bottom-right gear even while these cards open.
          </p>
        </article>
      </div>
    </div>
  );
}
