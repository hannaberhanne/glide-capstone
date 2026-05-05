import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../config/firebase";
import { apiClient } from "../lib/apiClient.js";
import useCanvasStatus from "../hooks/useCanvasStatus.js";
import "./CanvasSetup.css";

export default function CanvasSetup() {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const {
    canvasStatus,
    statusLoading,
    syncing,
    disconnecting,
    refetchCanvasStatus,
    syncCanvas,
    disconnectCanvas,
  } = useCanvasStatus();

  const canvasSummary = canvasStatus?.lastSyncSummary || null;
  const connected = Boolean(canvasStatus?.hasToken);
  const planSummary = useMemo(() => {
    if (!canvasSummary) return "Nothing has synced yet.";
    if (canvasSummary.materialTaskChanges > 0) {
      return "New Canvas work is in Glide+. Replan from Planner when you want it scheduled.";
    }
    return "No new Canvas work since the last sync.";
  }, [canvasSummary]);

  const handleSaveToken = async () => {
    if (!token.trim()) {
      setMessage("Paste a Canvas token first.");
      return;
    }

    if (!auth.currentUser) {
      setMessage("Log in before connecting Canvas.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const uid = auth.currentUser.uid;
      await apiClient.patch(`/api/users/${uid}`, { canvasToken: token.trim() });
      await refetchCanvasStatus();

      setMessage("Canvas token saved.");
    } catch (err) {
      console.error("Failed to save token:", err);
      setMessage("Failed to save token. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!auth.currentUser) {
      setMessage("Log in before syncing Canvas.");
      return;
    }
    setMessage("");
    try {
      const data = await syncCanvas({ canvasToken: token.trim() || undefined });
      setMessage(
        data?.materialTaskChanges > 0
          ? "Canvas synced. New work is ready in Planner."
          : "Canvas is up to date."
      );
    } catch (err) {
      console.error("Sync failed:", err);
      setMessage(err?.message || "Sync failed. Check your token and try again.");
    }
  };

  const handleDisconnect = async (deleteData = false) => {
    setMessage("");
    try {
      const data = await disconnectCanvas({ deleteData });
      setToken("");
      setMessage(data?.message || "Canvas disconnected.");
    } catch (err) {
      console.error("Disconnect failed:", err);
      setMessage(err?.message || "Failed to disconnect Canvas.");
    }
  };

  return (
    <div className="canvas-setup-container">
      <div className="canvas-setup-card">
        <h2 className="canvas-setup-title">Connect Canvas</h2>

        <p className="canvas-setup-sub">
          Paste a Canvas access token and Glide+ will pull your courses and assignments into your workspace.
        </p>

        <ol className="canvas-setup-steps">
          <li>Open Canvas, then go to <strong>Account &gt; Settings</strong>.</li>
          <li>Under <strong>Approved Integrations</strong>, create a new access token.</li>
          <li>Name it <em>Glide Sync</em>, copy the token, and paste it here.</li>
        </ol>

        <input
          className="canvas-token-input"
          placeholder="Canvas access token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />

        <div className="canvas-actions">
          <button
            className="canvas-setup-btn"
            onClick={handleSaveToken}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save token"}
          </button>
          <button
            className="canvas-setup-btn"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? "Syncing..." : "Sync now"}
          </button>
        </div>

        <section className="canvas-status-card" aria-label="Canvas connection status">
          <div className="canvas-status-head">
            <div>
              <p className="canvas-status-kicker">Canvas</p>
              <h3 className="canvas-status-title">{connected ? "Connected" : "Not connected"}</h3>
            </div>
            <span className={`canvas-status-pill ${connected ? "is-connected" : ""}`.trim()}>
              {connected ? "Connected" : "Offline"}
            </span>
          </div>

          {statusLoading ? (
            <p className="canvas-status-copy">Checking Canvas status…</p>
          ) : (
            <>
              <div className="canvas-status-grid">
                <div>
                  <span className="canvas-status-label">Last Sync</span>
                  <p>{canvasStatus?.lastSync ? new Date(canvasStatus.lastSync).toLocaleString() : "Never"}</p>
                </div>
                <div>
                  <span className="canvas-status-label">Courses</span>
                  <p>{canvasStatus?.coursesCount ?? 0}</p>
                </div>
                <div>
                  <span className="canvas-status-label">Assignments</span>
                  <p>{canvasStatus?.assignmentsCount ?? 0}</p>
                </div>
                <div>
                  <span className="canvas-status-label">Linked Tasks</span>
                  <p>{canvasStatus?.linkedTasksCount ?? 0}</p>
                </div>
              </div>

              <div className="canvas-status-summary">
                <p className="canvas-status-copy">{planSummary}</p>
                {canvasSummary ? (
                  <p className="canvas-status-copy canvas-status-copy--compact">
                    Imported {canvasSummary.tasksAdded || 0} new tasks, updated {canvasSummary.tasksUpdated || 0}, left {canvasSummary.tasksUnchanged || 0} untouched.
                  </p>
                ) : null}
              </div>

              {connected ? (
                <div className="canvas-danger-zone">
                  <button
                    className="canvas-setup-btn canvas-setup-btn-secondary"
                    onClick={() => handleDisconnect(false)}
                    disabled={disconnecting}
                  >
                    {disconnecting ? "Disconnecting..." : "Disconnect Canvas"}
                  </button>
                  <button
                    className="canvas-setup-btn canvas-setup-btn-danger"
                    onClick={() => handleDisconnect(true)}
                    disabled={disconnecting}
                  >
                    {disconnecting ? "Disconnecting..." : "Disconnect and remove data"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>

        {message && <p className="canvas-message">{message}</p>}

        <Link to="/dashboard" className="canvas-return-btn">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
