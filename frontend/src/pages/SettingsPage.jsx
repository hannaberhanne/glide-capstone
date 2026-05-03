import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "../config/firebase";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as updateFirebasePassword,
} from "firebase/auth";
import { apiClient } from "../lib/apiClient.js";
import useCanvasStatus from "../hooks/useCanvasStatus";
import useNotificationRegistration from "../hooks/useNotificationRegistration.js";
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

const getBrowserTimezone = () => {
  if (typeof Intl !== "undefined") {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolved) return resolved;
  }
  return "America/New_York";
};

const getDefaultNotificationPrefs = (timezoneFallback = getBrowserTimezone()) => ({
  pushEnabled: false,
  emailEnabled: false,
  quietHoursStart: "",
  quietHoursEnd: "",
  timezone: timezoneFallback,
  notifyDailyPlanReady: true,
  notifyMissedBlocks: true,
  notifyDueSoonTasks: true,
  notifyStreakRisk: true,
  notifyMajorReplans: true,
});

const getInitialNotificationPrefs = (userRecord) => {
  const canonical = userRecord?.preferences?.notifications;
  const timezoneFallback = userRecord?.timezone || getBrowserTimezone();
  const defaults = getDefaultNotificationPrefs(timezoneFallback);

  if (canonical && typeof canonical === "object" && !Array.isArray(canonical)) {
    return {
      ...defaults,
      ...canonical,
      timezone: canonical.timezone || defaults.timezone,
      quietHoursStart: canonical.quietHoursStart || "",
      quietHoursEnd: canonical.quietHoursEnd || "",
    };
  }

  const legacyNotifications =
    typeof userRecord?.notifications === "boolean"
      ? userRecord.notifications
      : typeof canonical === "boolean"
        ? canonical
        : defaults.notifyDueSoonTasks;
  const legacyWeeklySummary =
    typeof userRecord?.weeklySummary === "boolean"
      ? userRecord.weeklySummary
      : typeof userRecord?.preferences?.weeklySummary === "boolean"
        ? userRecord.preferences.weeklySummary
        : defaults.notifyDailyPlanReady;

  return {
    ...defaults,
    notifyDueSoonTasks: legacyNotifications,
    notifyDailyPlanReady: legacyWeeklySummary,
  };
};

const getInitialProfileForm = (userRecord) => ({
  firstName: userRecord?.firstName || "",
  lastName: userRecord?.lastName || "",
  email: auth.currentUser?.email || "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  homeTown: userRecord?.homeTown || "",
  university: userRecord?.university || "",
  year: userRecord?.year || "",
  major: userRecord?.major || "",
  timezone: userRecord?.timezone || "",
});

const getInitialVisualPrefs = (userRecord) => ({
  ...getStoredVisualPrefs(),
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
  const {
    canvasStatus,
    statusLoading,
    syncing: canvasSyncing,
    disconnecting: canvasDisconnecting,
    syncCanvas,
    disconnectCanvas,
  } = useCanvasStatus();
  const {
    prefs: accessibilityPrefs,
    updatePref: updateAccessibilityPref,
    increaseFontScale,
    decreaseFontScale,
    setPrefs: setAccessibilityPrefs,
  } = useAccessibilityPrefs();
  const {
    supported: pushSupported,
    vapidConfigured,
    permission: pushPermission,
    browserRegistered,
    currentBrowserToken,
    registering: pushRegistering,
    disabling: pushDisabling,
    registrationError: pushRegistrationError,
    registerThisBrowser,
    disableThisBrowser,
  } = useNotificationRegistration();

  const userRecord = Array.isArray(user) ? user[0] : user;
  const canvasConnected = Boolean(canvasStatus?.hasToken);
  const supportsPasswordChange = Boolean(
    auth.currentUser?.providerData?.some((provider) => provider?.providerId === "password")
  );
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
  const [notificationPrefs, setNotificationPrefs] = useState(() =>
    getInitialNotificationPrefs(userRecord)
  );
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [canvasMessage, setCanvasMessage] = useState("");
  const [pushMessage, setPushMessage] = useState("");

  const avatarPattern = useMemo(
    () => resolvePattern(form.major, userRecord?.category),
    [form.major, userRecord?.category]
  );

  useEffect(() => {
    setForm(getInitialProfileForm(userRecord));
    setPrefs(getInitialVisualPrefs(userRecord));
    setNotificationPrefs(getInitialNotificationPrefs(userRecord));
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

  const updatePref = (field, value) => {
    setPrefs((prev) => ({ ...prev, [field]: value }));
  };

  const toggleNotificationPref = (field) => {
    setNotificationPrefs((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const updateNotificationPref = (field, value) => {
    setNotificationPrefs((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(getInitialProfileForm(userRecord));
    setPrefs(getInitialVisualPrefs(userRecord));
    setNotificationPrefs(getInitialNotificationPrefs(userRecord));
    setAccessibilityPrefs(getStoredAccessibilityPrefs());
    setStatusMessage("");
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    if (!auth.currentUser) return;

    setSaving(true);
    setStatusMessage("");

    try {
      const wantsPasswordChange =
        form.currentPassword.trim() !== "" ||
        form.newPassword.trim() !== "" ||
        form.confirmPassword.trim() !== "";

      if (wantsPasswordChange) {
        if (!supportsPasswordChange) {
          throw new Error("Password changes are only available for email/password accounts.");
        }

        if (!form.currentPassword.trim()) {
          throw new Error("Enter your current password to change it.");
        }

        if (!form.newPassword.trim()) {
          throw new Error("Enter a new password.");
        }

        if (form.newPassword.length < 6) {
          throw new Error("New password must be at least 6 characters.");
        }

        if (form.newPassword !== form.confirmPassword) {
          throw new Error("New password and confirmation do not match.");
        }

        if (!auth.currentUser.email) {
          throw new Error("Current account email is missing. Sign in again and retry.");
        }

        const credential = EmailAuthProvider.credential(
          auth.currentUser.email,
          form.currentPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updateFirebasePassword(auth.currentUser, form.newPassword);
      }

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
          notifications: {
            ...notificationPrefs,
            timezone: notificationPrefs.timezone.trim() || form.timezone.trim() || getBrowserTimezone(),
            quietHoursStart: notificationPrefs.quietHoursStart || "",
            quietHoursEnd: notificationPrefs.quietHoursEnd || "",
          },
        },
      };

      await apiClient.patch(`/api/users/${auth.currentUser.uid}`, payload);
      setForm((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setStatusMessage(
        wantsPasswordChange ? "Profile updated. Password changed." : "Profile updated"
      );
      await refreshUser();
    } catch (err) {
      console.error("Profile update failed:", err);
      switch (err?.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
          setStatusMessage("Current password is incorrect.");
          break;
        case "auth/weak-password":
          setStatusMessage("New password is too weak.");
          break;
        case "auth/too-many-requests":
          setStatusMessage("Too many attempts. Wait a bit and try again.");
          break;
        default:
          setStatusMessage(err?.message || "Unable to save changes right now.");
          break;
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCanvasSync = async () => {
    setCanvasMessage("");
    try {
      const data = await syncCanvas();
      setCanvasMessage(
        data?.materialTaskChanges > 0
          ? "Canvas synced. Your workload changed, so replan from Planner when you are ready."
          : "Canvas synced successfully."
      );
    } catch (err) {
      console.error("Canvas sync failed:", err);
      setCanvasMessage(err?.message || "Unable to sync Canvas right now.");
    }
  };

  const handleCanvasDisconnect = async (deleteData = false) => {
    setCanvasMessage("");
    try {
      const data = await disconnectCanvas({ deleteData });
      setCanvasMessage(data?.message || "Canvas disconnected.");
    } catch (err) {
      console.error("Canvas disconnect failed:", err);
      setCanvasMessage(err?.message || "Unable to disconnect Canvas right now.");
    }
  };

  const handleRegisterBrowser = async () => {
    setPushMessage("");
    try {
      await registerThisBrowser();
      setPushMessage("This browser is now registered for push notifications.");
    } catch (err) {
      console.error("Push registration failed:", err);
      setPushMessage(err?.message || "Unable to register this browser for push notifications.");
    }
  };

  const handleDisableBrowser = async () => {
    setPushMessage("");
    try {
      await disableThisBrowser();
      setPushMessage("Push notifications have been disabled on this browser.");
    } catch (err) {
      console.error("Disable browser notifications failed:", err);
      setPushMessage(err?.message || "Unable to disable push notifications on this browser.");
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
            Current Password
            <input
              className="settings-input"
              value={form.currentPassword}
              onChange={(e) => updateFormField("currentPassword", e.target.value)}
              placeholder={supportsPasswordChange ? "Enter current password" : "Not available for this account"}
              type="password"
              autoComplete="current-password"
              disabled={!supportsPasswordChange}
            />
          </label>

          <label className="settings-field-full">
            New Password
            <input
              className="settings-input"
              value={form.newPassword}
              onChange={(e) => updateFormField("newPassword", e.target.value)}
              placeholder={supportsPasswordChange ? "Enter new password" : "Not available for this account"}
              type="password"
              autoComplete="new-password"
              disabled={!supportsPasswordChange}
            />
          </label>

          <label className="settings-field-full">
            Confirm New Password
            <input
              className="settings-input"
              value={form.confirmPassword}
              onChange={(e) => updateFormField("confirmPassword", e.target.value)}
              placeholder={supportsPasswordChange ? "Confirm new password" : "Not available for this account"}
              type="password"
              autoComplete="new-password"
              disabled={!supportsPasswordChange}
            />
          </label>

          {!supportsPasswordChange ? (
            <p className="settings-field-full settings-muted-text">
              This account does not use email/password sign-in. Use your provider's account settings instead.
            </p>
          ) : null}

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
      <form className="settings-form" onSubmit={handleProfileSave}>
        <div className="settings-section">
          <h3 className="settings-section-title">Notifications</h3>
          <div className="settings-preference-list">
            <label className="settings-preference-row checkbox-row">
              <span className="settings-preference-label">Enable push notifications</span>
              <input
                type="checkbox"
                checked={notificationPrefs.pushEnabled}
                onChange={() => toggleNotificationPref("pushEnabled")}
              />
            </label>

            <div className="settings-preference-row settings-preference-row-stack">
              <div>
                <span className="settings-preference-label">Push status</span>
                <p className="settings-muted-text">
                  {!pushSupported
                    ? "Push notifications are not supported in this browser."
                    : !vapidConfigured
                      ? "Missing web push VAPID configuration."
                      : browserRegistered
                        ? `Registered on this browser (${pushPermission}).`
                        : `Not registered on this browser (${pushPermission}).`}
                </p>
              </div>
              <div className="settings-canvas-actions">
                <button
                  type="button"
                  className="settings-btn inline-btn"
                  onClick={handleRegisterBrowser}
                  disabled={!pushSupported || !vapidConfigured || pushRegistering || pushDisabling}
                >
                  {pushRegistering ? "Registering..." : browserRegistered ? "Refresh Registration" : "Enable on This Browser"}
                </button>
                {currentBrowserToken?.active ? (
                  <button
                    type="button"
                    className="settings-link"
                    onClick={handleDisableBrowser}
                    disabled={pushDisabling || pushRegistering}
                  >
                    {pushDisabling ? "Disabling..." : "Disable on This Browser"}
                  </button>
                ) : null}
              </div>
              {pushRegistrationError ? (
                <p className="settings-status">{pushRegistrationError}</p>
              ) : pushMessage ? (
                <p className="settings-status">{pushMessage}</p>
              ) : null}
            </div>

            <label className="settings-preference-row checkbox-row">
              <span className="settings-preference-label">Enable email notifications</span>
              <input
                type="checkbox"
                checked={notificationPrefs.emailEnabled}
                onChange={() => toggleNotificationPref("emailEnabled")}
              />
            </label>

            <div className="settings-preference-row settings-preference-row-stack">
              <div>
                <span className="settings-preference-label">Quiet hours</span>
                <p className="settings-muted-text">Leave blank to allow notifications at any time.</p>
              </div>
              <div className="settings-inline-grid">
                <input
                  className="settings-input"
                  type="time"
                  value={notificationPrefs.quietHoursStart}
                  onChange={(e) => updateNotificationPref("quietHoursStart", e.target.value)}
                  aria-label="Quiet hours start"
                />
                <input
                  className="settings-input"
                  type="time"
                  value={notificationPrefs.quietHoursEnd}
                  onChange={(e) => updateNotificationPref("quietHoursEnd", e.target.value)}
                  aria-label="Quiet hours end"
                />
              </div>
            </div>

            <div className="settings-preference-row settings-preference-row-stack">
              <div>
                <span className="settings-preference-label">Notification timezone</span>
                <p className="settings-muted-text">Used for quiet hours and send windows.</p>
              </div>
              <input
                className="settings-input"
                value={notificationPrefs.timezone}
                onChange={(e) => updateNotificationPref("timezone", e.target.value)}
                placeholder="America/New_York"
                aria-label="Notification timezone"
              />
            </div>

            <label className="settings-preference-row checkbox-row">
              <span className="settings-preference-label">Daily plan ready</span>
              <input
                type="checkbox"
                checked={notificationPrefs.notifyDailyPlanReady}
                onChange={() => toggleNotificationPref("notifyDailyPlanReady")}
              />
            </label>

            <label className="settings-preference-row checkbox-row">
              <span className="settings-preference-label">Missed schedule blocks</span>
              <input
                type="checkbox"
                checked={notificationPrefs.notifyMissedBlocks}
                onChange={() => toggleNotificationPref("notifyMissedBlocks")}
              />
            </label>

            <label className="settings-preference-row checkbox-row">
              <span className="settings-preference-label">Due soon tasks</span>
              <input
                type="checkbox"
                checked={notificationPrefs.notifyDueSoonTasks}
                onChange={() => toggleNotificationPref("notifyDueSoonTasks")}
              />
            </label>

            <label className="settings-preference-row checkbox-row">
              <span className="settings-preference-label">Streak risk</span>
              <input
                type="checkbox"
                checked={notificationPrefs.notifyStreakRisk}
                onChange={() => toggleNotificationPref("notifyStreakRisk")}
              />
            </label>

            <label className="settings-preference-row checkbox-row">
              <span className="settings-preference-label">Major replans</span>
              <input
                type="checkbox"
                checked={notificationPrefs.notifyMajorReplans}
                onChange={() => toggleNotificationPref("notifyMajorReplans")}
              />
            </label>
          </div>
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
                <p>{statusLoading ? "Checking..." : (canvasConnected ? "Connected" : "Offline")}</p>
              </div>

              <div>
                <span className="settings-info-label">Connection</span>
                <p>
                  {canvasConnected
                    ? "Your Canvas account is linked."
                    : "Connect Canvas to import assignments and deadlines."}
                </p>
              </div>

              <div>
                <span className="settings-info-label">Last Sync</span>
                <p>{canvasStatus?.lastSync ? new Date(canvasStatus.lastSync).toLocaleString() : "Never"}</p>
              </div>

              <div>
                <span className="settings-info-label">Linked Tasks</span>
                <p>{canvasStatus?.linkedTasksCount ?? 0}</p>
              </div>

              <div>
                <span className="settings-info-label">Planning Impact</span>
                <p>
                  {canvasStatus?.lastSyncSummary?.materialTaskChanges > 0
                    ? "Last sync changed the workload. Replan from Planner when you are ready."
                    : "Last sync did not change the workload."}
                </p>
              </div>
            </div>

            <div className="settings-canvas-actions">
              <button
                type="button"
                className="settings-btn inline-btn"
                onClick={handleCanvasSync}
                disabled={!canvasConnected || canvasSyncing}
              >
                {canvasSyncing ? "Syncing..." : "Sync Now"}
              </button>

              <Link to="/canvas-setup" className="settings-btn inline-btn settings-btn-secondary">
                {canvasConnected ? "Manage Connection" : "Connect Canvas"}
              </Link>

              {canvasConnected ? (
                <>
                  <button
                    type="button"
                    className="settings-link"
                    onClick={() => handleCanvasDisconnect(false)}
                    disabled={canvasDisconnecting}
                  >
                    {canvasDisconnecting ? "Disconnecting..." : "Disconnect"}
                  </button>
                  <button
                    type="button"
                    className="settings-link settings-link-danger"
                    onClick={() => handleCanvasDisconnect(true)}
                    disabled={canvasDisconnecting}
                  >
                    {canvasDisconnecting ? "Disconnecting..." : "Disconnect + Remove Data"}
                  </button>
                </>
              ) : null}
            </div>

            {canvasMessage ? <p className="settings-status">{canvasMessage}</p> : null}
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
