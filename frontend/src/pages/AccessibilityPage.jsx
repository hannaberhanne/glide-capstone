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

  // -----------------------------------------------------
  // LOAD SAVED SETTINGS ON PAGE LOAD
  // -----------------------------------------------------
  useEffect(() => {
    const savedDark = localStorage.getItem("darkMode") === "true";
    const savedHigh = localStorage.getItem("highContrast") === "true";
    const savedMotion = localStorage.getItem("reduceMotion") === "true";
    const savedFont = parseInt(localStorage.getItem("fontScale"), 10);

    if (savedDark) {
      setDarkMode(true);
      document.documentElement.classList.add("dark-mode");
    }

    if (savedHigh) {
      setHighContrast(true);
      document.documentElement.classList.add("high-contrast");
    }

    if (savedMotion) {
      setReduceMotion(true);
      document.documentElement.classList.add("reduce-motion");
    }

    if (!isNaN(savedFont)) {
      setFontScale(savedFont);
      document.documentElement.style.setProperty(
        "--font-scale",
        `${savedFont}%`
      );
    }
  }, []);

  // ----------------------------
  // FONT SIZE LOGIC
  // ----------------------------
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--font-scale",
      `${fontScale}%`
    );
  }, [fontScale]);

  const increaseFont = () =>
    setFontScale((prev) => Math.min(prev + 10, MAX_SCALE));

  const decreaseFont = () =>
    setFontScale((prev) => Math.max(prev - 10, MIN_SCALE));

  // ----------------------------
  // DARK MODE LOGIC
  // ----------------------------
  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  // ----------------------------
  // HIGH CONTRAST LOGIC
  // ----------------------------
  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrast);
    localStorage.setItem("highContrast", highContrast);
  }, [highContrast]);

  // ----------------------------
  // REDUCE MOTION LOGIC
  // ----------------------------
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
    localStorage.setItem("reduceMotion", reduceMotion);
  }, [reduceMotion]);

  // ----------------------------
  // RESET + SAVE
  // ----------------------------
  const resetDefaults = () => {
    setFontScale(DEFAULT_SCALE);
    setDarkMode(false);
    setHighContrast(false);
    setReduceMotion(false);

    // Remove from localStorage
    localStorage.removeItem("darkMode");
    localStorage.removeItem("highContrast");
    localStorage.removeItem("reduceMotion");
    localStorage.removeItem("fontScale");

    // Remove classes
    document.documentElement.classList.remove("dark-mode");
    document.documentElement.classList.remove("high-contrast");
    document.documentElement.classList.remove("reduce-motion");
    document.documentElement.style.setProperty("--font-scale", "100%");
  };

  const saveChanges = () => {
    // You already save automatically on toggle — so this is optional.
    localStorage.setItem("fontScale", fontScale);
    alert("Settings saved!");
  };

  return (
    <div className="accessibility-container">
      <h1 className="accessibility-title">Accessibility Settings</h1>

      {/* -------------------- APPEARANCE CARD -------------------- */}
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

      {/* -------------------- MOTION CARD -------------------- */}
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

      {/* -------------------- FOOTER BUTTONS -------------------- */}
      <div className="accessibility-footer">
        <button className="back-btn" onClick={() => navigate("/profile")}>
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
