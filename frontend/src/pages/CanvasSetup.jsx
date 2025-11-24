import "./CanvasSetup.css";

export default function CanvasSetup() {
  return (
    <div className="canvas-setup-container">
      <div className="canvas-setup-card">

        <h2 className="canvas-setup-title">Canvas Sync Setup</h2>

        <p className="canvas-setup-sub">
          Follow these steps to enable automatic importing of assignments,
          deadlines, and class information from Canvas.
        </p>

        {/* Placeholder Steps */}
        <ol className="canvas-setup-steps">
          <li>Install the Tampermonkey browser extension.</li>
          <li>Install the Glide+ Canvas Sync Script.</li>
          <li>Visit your Canvas dashboard to complete the connection.</li>
        </ol>

        <button className="canvas-setup-btn">
          Install Sync Script →
        </button>

        <a href="/dashboard" className="canvas-setup-skip">
          Skip for now
        </a>

      </div>
    </div>
  );
}
