import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth } from "../config/firebase";
import "./CanvasSetup.css";

export default function CanvasSetup() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState(null);

  // Fetch the logged-in user's Firestore document ID
  useEffect(() => {
    const fetchUser = async () => {
      if (!auth.currentUser) return;

      try {
        const idToken = await auth.currentUser.getIdToken();

        const res = await fetch(`${API_URL}/api/users`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setUserId(data[0].userId);
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    fetchUser();
  }, [API_URL]);

  const handleSaveToken = async () => {
    if (!token.trim()) {
      setMessage("Please enter your Canvas Access Token.");
      return;
    }

    if (!auth.currentUser) {
      setMessage("You must be logged in to save your token.");
      return;
    }

    if (!userId) {
      setMessage("Could not load your user account. Try again.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const idToken = await auth.currentUser.getIdToken();

      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ canvasToken: token.trim() }),
      });

      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

      setMessage("Canvas token saved successfully!");
      setToken("");
    } catch (err) {
      console.error("Failed to save token:", err);
      setMessage("Failed to save token. Try again.");
    } finally {
      setSaving(false);
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

        <button
          className="canvas-setup-btn"
          onClick={handleSaveToken}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Token →"}
        </button>

        {message && <p className="canvas-message">{message}</p>}

        {/* Return to Dashboard Link */}
        <Link to="/dashboard" className="canvas-return-btn">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
