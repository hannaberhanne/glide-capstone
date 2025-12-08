import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AccessibilityPage.css";

export default function AccessibilityPage() {
  const navigate = useNavigate();

  // Default values
  const DEFAULT_SCALE = 100;
  const MIN_SCALE = 80;
  const MAX_SCALE = 140;

  const [fontScale, setFontScale] = useState(DEFAULT_SCALE);
  const [darkMode, setDarkMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Apply font scale globally
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--font-scale",
      `${fontScale}%`
    );
  }, [fontScale]);

  // Button handlers
  const increaseFont = () => setFontScale(prev => Math.min(prev + 10, MAX_SCALE));
  const decreaseFont = () => setFontScale(prev => Math.max(prev - 10, MIN_SCALE));

  const resetDefaults = () => {
    setFontScale(DEFAULT_SCALE);
    setDarkMode(false);
    setHighContrast(false);
    setReduceMotion(false);
  };

  const saveChanges = () => {
    // BACKEND SAVE LATER
    alert("Settings saved (UI only right now)");
  };

  return (
    <div className="accessibility-container">
      
      {/* Page Title */}
      <h1 className="accessibility-title">Accessibility Settings</h1>

      {/* Appearance Card */}
      <div className="accessibility-card">
        <h2 className="card-title">Appearance</h2>

        <div className="setting-row">
          <span>Dark Mode</span>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode(!darkMode)}
          />
        </div>

        <div className="setting-row">
          <span>High Contrast</span>
          <input
            type="checkbox"
            checked={highContrast}
            onChange={() => setHighContrast(!highContrast)}
          />
        </div>

        <div className="font-size-row">
          <span>Font Size</span>
          <div className="font-controls">
            <button onClick={decreaseFont}>−</button>
            <span>{fontScale}%</span>
            <button onClick={increaseFont}>+</button>
          </div>
        </div>
      </div>

      {/* Motion Card */}
      <div className="accessibility-card">
        <h2 className="card-title">Motion</h2>

        <div className="setting-row">
          <span>Reduce Motion</span>
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={() => setReduceMotion(!reduceMotion)}
          />
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="accessibility-footer">
        <button
          className="back-btn"
          onClick={() => navigate("/profile")}
        >
          ← Back
        </button>

        <div className="footer-actions">
          <button className="save-btn" onClick={saveChanges}>
            Save Changes
          </button>
          <button className="reset-btn" onClick={resetDefaults}>
            Reset to Defaults
          </button>
        </div>
      </div>

    </div>
  );
}
