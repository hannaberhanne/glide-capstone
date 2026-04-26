import { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../config/firebase";
import { apiClient } from "../lib/apiClient.js";
import "./CanvasSetup.css";

export default function CanvasSetup() {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const handleSaveToken = async () => {
    if (!token.trim()) {
      setMessage("Please enter your Canvas Access Token.");
      return;
    }

    if (!auth.currentUser) {
      setMessage("You must be logged in to save your token.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const uid = auth.currentUser.uid;
      await apiClient.patch(`/api/users/${uid}`, { canvasToken: token.trim() });

      setMessage("Canvas token saved successfully!");
    } catch (err) {
      console.error("Failed to save token:", err);
      setMessage("Failed to save token. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!auth.currentUser) {
      setMessage("You must be logged in to sync.");
      return;
    }
    setSyncing(true);
    setMessage("");
    try {
      const data = await apiClient.post("/api/canvas/sync", {
        canvasToken: token.trim() || undefined,
      });
      if (data.success === false) throw new Error(data.error || "Sync failed");
      setMessage(data.message || "Canvas synced successfully!");
    } catch (err) {
      console.error("Sync failed:", err);
      setMessage(err?.message || "Sync failed. Check your token and try again.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="canvas-setup-container">
      <div className="canvas-setup-card">
        <h2 className="canvas-setup-title">Canvas Sync Setup</h2>

        <p className="canvas-setup-sub">
          Connect your Canvas account to automatically pull assignments,
          deadlines, and course information into Glide+.
        </p>

        <ol className="canvas-setup-steps">
          <li>Log into Canvas and open <strong>Account → Settings</strong>.</li>
          <li>Scroll to <strong>Approved Integrations</strong>.</li>
          <li>Click <strong>+ New Access Token</strong>.</li>
          <li>Name it something like <em>Glide Sync</em> and generate the token.</li>
          <li>Copy the token and paste it below.</li>
        </ol>

        <input
          className="canvas-token-input"
          placeholder="Paste your Canvas Access Token..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />

        <div className="canvas-actions">
          <button
            className="canvas-setup-btn"
            onClick={handleSaveToken}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Token →"}
          </button>
          <button
            className="canvas-setup-btn"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>

        {message && <p className="canvas-message">{message}</p>}

        {/* Return to Dashboard Link */}
        <Link to="/dashboard" className="canvas-return-btn">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
