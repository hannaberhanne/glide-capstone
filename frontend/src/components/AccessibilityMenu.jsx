import { useState } from "react";
import "./AccessibilityMenu.css";
import useAccessibilityPrefs from "../hooks/useAccessibilityPrefs";

export default function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const {
    prefs,
    updatePref,
    togglePref,
    increaseFontScale,
    decreaseFontScale,
    resetAccessibilityPrefs,
  } = useAccessibilityPrefs();

  const resetDefaults = () => {
    resetAccessibilityPrefs();
  };

  return (
    <div className="accessibility-wrapper">
      <button
        className="accessibility-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Accessibility options"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path
            d="M7.4 2.1h3.2l.5 1.7c.4.1.8.3 1.2.5l1.6-.8 2.2 2.2-.8 1.6c.2.4.4.8.5 1.2l1.7.5v3.2l-1.7.5c-.1.4-.3.8-.5 1.2l.8 1.6-2.2 2.2-1.6-.8c-.4.2-.8.4-1.2.5l-.5 1.7H7.4l-.5-1.7a5.5 5.5 0 0 1-1.2-.5l-1.6.8-2.2-2.2.8-1.6a5.5 5.5 0 0 1-.5-1.2L.5 12.3V9.1l1.7-.5c.1-.4.3-.8.5-1.2l-.8-1.6 2.2-2.2 1.6.8c.4-.2.8-.4 1.2-.5l.5-1.7Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="10.7" r="2.3" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>

      {open && (
        <div className="accessibility-panel">
          <div className="accessibility-panel-head">
            <span>Accessibility</span>
            <button
              className="accessibility-close"
              onClick={() => setOpen(false)}
              aria-label="Close accessibility settings"
            >
              ×
            </button>
          </div>

          <div className="accessibility-row">
            <span>Dark mode</span>
            <button
              className={`accessibility-pill ${prefs.theme === "dark" ? "active" : ""}`}
              onClick={() => updatePref("theme", prefs.theme === "dark" ? "light" : "dark")}
            >
              {prefs.theme === "dark" ? "On" : "Off"}
            </button>
          </div>

          <div className="accessibility-row">
            <span>High contrast</span>
            <button
              className={`accessibility-pill ${prefs.highContrast ? "active" : ""}`}
              onClick={() => togglePref("highContrast")}
            >
              {prefs.highContrast ? "On" : "Off"}
            </button>
          </div>

          <div className="accessibility-row">
            <span>Highlight links</span>
            <button
              className={`accessibility-pill ${prefs.highlightLinks ? "active" : ""}`}
              onClick={() => togglePref("highlightLinks")}
            >
              {prefs.highlightLinks ? "On" : "Off"}
            </button>
          </div>

          <div className="accessibility-row">
            <span>Font scale</span>
            <div className="font-controls">
              <button onClick={decreaseFontScale}>−</button>
              <span>{prefs.fontScale}%</span>
              <button onClick={increaseFontScale}>+</button>
            </div>
          </div>

          <div className="accessibility-row">
            <span>Reduce motion</span>
            <button
              className={`accessibility-pill ${prefs.reduceMotion ? "active" : ""}`}
              onClick={() => togglePref("reduceMotion")}
            >
              {prefs.reduceMotion ? "On" : "Off"}
            </button>
          </div>

          <div className="accessibility-actions">
            <button className="accessibility-reset" onClick={resetDefaults}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
