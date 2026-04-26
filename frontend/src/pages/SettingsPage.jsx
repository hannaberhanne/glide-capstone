import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "../config/firebase";
import { apiClient } from "../lib/apiClient.js";
import useCanvasStatus from "../hooks/useCanvasStatus";
import useUser from "../hooks/useUser";
import useAccessibilityPrefs, {
  getStoredAccessibilityPrefs,
} from "../hooks/useAccessibilityPrefs";
import PixelIcon from "../components/PixelIcon.jsx";
import "./SettingsPage.css";

const OVERRIDE_PATTERNS = {
  academic: "academic",
  health: "health",
  personal: "personal",
};

const TABS = [
  { id: "general", label: "General" },
  { id: "progress", label: "Progress" },
  { id: "preferences", label: "Preferences" },
  { id: "student", label: "Student" },
];

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

const getStoredVisualPrefs = () => ({
  taskColor: localStorage.getItem("taskColor") || "purple",
  goalColor: localStorage.getItem("goalColor") || "blue",
  defaultPriority: localStorage.getItem("defaultPriority") || "medium",
});

const getInitialProfileForm = (userRecord) => ({
  firstName: userRecord?.firstName || "",
  lastName: userRecord?.lastName || "",
  email: auth.currentUser?.email || "",
  password: "",
  homeTown: userRecord?.homeTown || "",
  university: userRecord?.university || "",
  year: userRecord?.year || "",
  major: userRecord?.major || "",
  timezone: userRecord?.timezone || "",
});

const getInitialVisualPrefs = (userRecord) => ({
  ...getStoredVisualPrefs(),
  notifications:
    userRecord?.notifications ?? userRecord?.preferences?.notifications ?? false,
  weeklySummary:
    userRecord?.weeklySummary ?? userRecord?.preferences?.weeklySummary ?? false,
  taskColor:
    userRecord?.taskColor ??
    userRecord?.preferences?.taskColor ??
    getStoredVisualPrefs().taskColor,
  goalColor:
    userRecord?.goalColor ??
    userRecord?.preferences?.goalColor ??
    getStoredVisualPrefs().goalColor,
  defaultPriority:
    userRecord?.defaultPriority ??
    userRecord?.preferences?.defaultPriority ??
    getStoredVisualPrefs().defaultPriority,
});

export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { user, xp, refreshUser } = useUser();
  const { canvasStatus } = useCanvasStatus();
  const {
    prefs: accessibilityPrefs,
    updatePref: updateAccessibilityPref,
    increaseFontScale,
    decreaseFontScale,
    setPrefs: setAccessibilityPrefs,
  } = useAccessibilityPrefs();

  const userRecord = Array.isArray(user) ? user[0] : user;
  const canvasConnected = Boolean(canvasStatus?.hasToken);
  const displayName =
    [userRecord?.firstName, userRecord?.lastName].filter(Boolean).join(" ") ||
    auth.currentUser?.displayName ||
    "User";

  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    TABS.some((tab) => tab.id === requestedTab) ? requestedTab : "general"
  );
  const [form, setForm] = useState(() => getInitialProfileForm(userRecord));
  const [prefs, setPrefs] = useState(() => getInitialVisualPrefs(userRecord));
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const avatarPattern = useMemo(
    () => resolvePattern(form.major, userRecord?.category),
    [form.major, userRecord?.category]
  );

  useEffect(() => {
    setForm(getInitialProfileForm(userRecord));
    setPrefs(getInitialVisualPrefs(userRecord));
  }, [userRecord]);

  useEffect(() => {
    if (TABS.some((tab) => tab.id === requestedTab)) {
      if (requestedTab !== activeTab) {
        setActiveTab(requestedTab);
      }
      return;
    }

    if (requestedTab !== null) {
      setSearchParams({}, { replace: true });
    }

    if (activeTab !== "general") {
      setActiveTab("general");
    }
  }, [activeTab, requestedTab, setSearchParams]);

  useEffect(() => {
    localStorage.setItem("taskColor", prefs.taskColor);
  }, [prefs.taskColor]);

  useEffect(() => {
    localStorage.setItem("goalColor", prefs.goalColor);
  }, [prefs.goalColor]);

  useEffect(() => {
    localStorage.setItem("defaultPriority", prefs.defaultPriority);
  }, [prefs.defaultPriority]);

  const selectTab = (tab) => {
    setActiveTab(tab);
    if (tab === "general") {
      setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ tab }, { replace: true });
  };

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

  const updatePref = (field, value) => {
    setPrefs((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(getInitialProfileForm(userRecord));
    setPrefs(getInitialVisualPrefs(userRecord));
    setAccessibilityPrefs(getStoredAccessibilityPrefs());
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
        homeTown: form.homeTown.trim(),
        university: form.university.trim(),
        year: form.year.trim(),
        major: form.major.trim(),
        timezone: form.timezone.trim(),
        preferences: {
          ...prefs,
          ...accessibilityPrefs,
        },
      };

      await apiClient.patch(`/api/users/${auth.currentUser.uid}`, payload);
      setStatusMessage("Profile updated");
      await refreshUser();
    } catch (err) {
      console.error("Profile update failed:", err);
      setStatusMessage("Unable to save changes right now.");
    } finally {
      setSaving(false);
    }
  };

  const renderGeneralTab = () => (
    <section className="settings-panel">
      <div className="settings-panel-header">
        <div>
          <h2 className="settings-panel-title">Profile</h2>
          <p className="settings-panel-subtitle">Manage your core profile information.</p>
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
              value={form.homeTown}
              onChange={(e) => updateFormField("homeTown", e.target.value)}
              placeholder="Home town"
            />
          </label>
        </div>

        <div className="settings-form-actions">
          <button className="settings-btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button className="settings-link" type="button" onClick={resetForm}>
            Reset
          </button>
        </div>

        {statusMessage ? <p className="settings-status">{statusMessage}</p> : null}
      </form>
    </section>
  );

  const renderProgressTab = () => (
    <section className="settings-panel">
      <div className="settings-panel-header">
        <div>
          <h2 className="settings-panel-title">Progress</h2>
          <p className="settings-panel-subtitle">Track your performance and achievements.</p>
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
          <p className="settings-stat-value">{userRecord?.longestStreak ?? 0} days</p>
        </article>

        <article className="settings-stat-card">
          <p className="settings-stat-label">Tasks Completed</p>
          <p className="settings-stat-value">{userRecord?.tasksCompleted ?? 0}</p>
        </article>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Badges</h3>
        <div className="badge-grid">
          {(userRecord?.badges?.length ? userRecord.badges : ["No badges unlocked yet"]).map(
            (badge, index) => (
              <div className="badge-card" key={index}>
                {badge}
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );

  const renderPreferencesTab = () => (
    <section className="settings-panel">
      <div className="settings-panel-header">
        <div>
          <h2 className="settings-panel-title">Preferences</h2>
          <p className="settings-panel-subtitle">Customize how Glide+ feels day to day.</p>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Notifications</h3>
        <div className="settings-preference-list">
          <label className="settings-preference-row checkbox-row">
            <span className="settings-preference-label">Receive task reminders</span>
            <input
              type="checkbox"
              checked={prefs.notifications}
              onChange={() => togglePref("notifications")}
            />
          </label>

          <label className="settings-preference-row checkbox-row">
            <span className="settings-preference-label">Weekly progress summary</span>
            <input
              type="checkbox"
              checked={prefs.weeklySummary}
              onChange={() => togglePref("weeklySummary")}
            />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Appearance</h3>
        <div className="settings-preference-list">
          <div className="settings-preference-row">
            <span className="settings-preference-label">Theme</span>
            <select
              className="settings-select"
              value={accessibilityPrefs.theme}
              onChange={(e) => updateAccessibilityPref("theme", e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="settings-preference-row">
            <span className="settings-preference-label">Task color</span>
            <select
              className="settings-select"
              value={prefs.taskColor}
              onChange={(e) => updatePref("taskColor", e.target.value)}
            >
              <option value="purple">Purple</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="orange">Orange</option>
            </select>
          </div>

          <div className="settings-preference-row">
            <span className="settings-preference-label">Goal color</span>
            <select
              className="settings-select"
              value={prefs.goalColor}
              onChange={(e) => updatePref("goalColor", e.target.value)}
            >
              <option value="blue">Blue</option>
              <option value="purple">Purple</option>
              <option value="green">Green</option>
              <option value="orange">Orange</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Task Defaults</h3>
        <div className="settings-preference-list">
          <div className="settings-preference-row">
            <span className="settings-preference-label">Default priority</span>
            <select
              className="settings-select"
              value={prefs.defaultPriority}
              onChange={(e) => updatePref("defaultPriority", e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Accessibility</h3>
        <div className="settings-preference-list">
          <div className="settings-preference-row">
            <span className="settings-preference-label">Font scale</span>
            <div className="settings-font-scale">
              <button type="button" className="settings-font-btn" onClick={decreaseFontScale}>
                −
              </button>
              <span className="settings-font-value">{accessibilityPrefs.fontScale}%</span>
              <button type="button" className="settings-font-btn" onClick={increaseFontScale}>
                +
              </button>
            </div>
          </div>

          <div className="settings-preference-row">
            <span className="settings-preference-label">High contrast</span>
            <select
              className="settings-select"
              value={accessibilityPrefs.highContrast ? "on" : "off"}
              onChange={(e) =>
                updateAccessibilityPref("highContrast", e.target.value === "on")
              }
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </div>

          <div className="settings-preference-row">
            <span className="settings-preference-label">Highlight links</span>
            <select
              className="settings-select"
              value={accessibilityPrefs.highlightLinks ? "on" : "off"}
              onChange={(e) =>
                updateAccessibilityPref("highlightLinks", e.target.value === "on")
              }
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </div>

          <div className="settings-preference-row">
            <span className="settings-preference-label">Reduce motion</span>
            <select
              className="settings-select"
              value={accessibilityPrefs.reduceMotion ? "on" : "off"}
              onChange={(e) =>
                updateAccessibilityPref("reduceMotion", e.target.value === "on")
              }
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );

  const renderStudentTab = () => (
    <section className="settings-panel">
      <div className="settings-panel-header student-header">
        <div>
          <h2 className="settings-panel-title">Student</h2>
          <p className="settings-panel-subtitle">
            Manage your academic profile and Canvas connection.
          </p>
        </div>
        <div className="student-meta">
          <span>{form.university || "University not set"}</span>
          <span>·</span>
          <span>{form.year || "Year not set"}</span>
          <span>·</span>
          <span>{form.major || "Major not set"}</span>
        </div>
      </div>

      <form className="settings-form" onSubmit={handleProfileSave}>
        <div className="student-grid">
          <article className="settings-info-card">
            <h3 className="settings-section-title">Academic Info</h3>
            <div className="settings-form-grid">
              <label className="settings-field-full">
                University
                <input
                  className="settings-input"
                  value={form.university}
                  onChange={(e) => updateFormField("university", e.target.value)}
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
            <h3 className="settings-section-title">Canvas Sync</h3>
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
          <button className="settings-link" type="button" onClick={resetForm}>
            Reset
          </button>
        </div>

        {statusMessage ? <p className="settings-status">{statusMessage}</p> : null}
      </form>
    </section>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "progress":
        return renderProgressTab();
      case "preferences":
        return renderPreferencesTab();
      case "student":
        return renderStudentTab();
      case "general":
      default:
        return renderGeneralTab();
    }
  };

  return (
    <div className="settings-layout">
      <header className="settings-page-head">
        <div className="settings-page-identity">
          <div className="settings-page-avatar" aria-hidden>
            <PixelIcon pattern={avatarPattern} />
          </div>
          <div>
            <p className="settings-page-kicker">Settings</p>
            <h1 className="settings-page-title">{displayName}</h1>
            <p className="settings-page-subtitle">
              Profile, progress, preferences, and student setup.
            </p>
          </div>
        </div>

        <div className="settings-page-actions">
          <button className="settings-link settings-link-reset" onClick={resetForm} type="button">
            Reset
          </button>
          <button className="settings-logout-link" onClick={handleLogout} type="button">
            Log Out
          </button>
        </div>
      </header>

      <div className="settings-tabbar" role="tablist" aria-label="Settings sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`settings-tab ${activeTab === tab.id ? "active" : ""}`.trim()}
            onClick={() => selectTab(tab.id)}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className="settings-content">{renderTabContent()}</main>
    </div>
  );
}
