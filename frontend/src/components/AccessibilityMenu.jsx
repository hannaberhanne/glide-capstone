import { useEffect, useState } from "react";
import "./AccessibilityMenu.css";

const DEFAULT_SCALE = 100;
const MIN_SCALE = 80;
const MAX_SCALE = 140;

export default function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highlightLinks, setHighlightLinks] = useState(false);
  const [fontScale, setFontScale] = useState(DEFAULT_SCALE);

  useEffect(() => {
    const savedDark = localStorage.getItem("darkMode") === "true";
    const savedHigh = localStorage.getItem("highContrast") === "true";
    const savedMotion = localStorage.getItem("reduceMotion") === "true";
    const savedHighlight = localStorage.getItem("highlightLinks") === "true";
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

    if (savedHighlight) {
      setHighlightLinks(true);
      document.documentElement.classList.add("highlight-links");
    }

    if (!isNaN(savedFont)) {
      setFontScale(savedFont);
      document.documentElement.style.setProperty("--font-scale", `${savedFont}%`);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrast);
    localStorage.setItem("highContrast", highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
    localStorage.setItem("reduceMotion", reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.classList.toggle("highlight-links", highlightLinks);
    localStorage.setItem("highlightLinks", highlightLinks);
  }, [highlightLinks]);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", `${fontScale}%`);
    localStorage.setItem("fontScale", fontScale);
  }, [fontScale]);

  const increaseFont = () =>
    setFontScale((prev) => Math.min(prev + 10, MAX_SCALE));

  const decreaseFont = () =>
    setFontScale((prev) => Math.max(prev - 10, MIN_SCALE));

  const resetDefaults = () => {
    setDarkMode(false);
    setHighContrast(false);
    setReduceMotion(false);
    setHighlightLinks(false);
    setFontScale(DEFAULT_SCALE);
    localStorage.removeItem("darkMode");
    localStorage.removeItem("highContrast");
    localStorage.removeItem("reduceMotion");
    localStorage.removeItem("highlightLinks");
    localStorage.removeItem("fontScale");
    document.documentElement.classList.remove("dark-mode");
    document.documentElement.classList.remove("high-contrast");
    document.documentElement.classList.remove("reduce-motion");
    document.documentElement.classList.remove("highlight-links");
    document.documentElement.style.setProperty("--font-scale", "100%");
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
        <span aria-hidden>⚙️</span>
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
              className={`accessibility-pill ${darkMode ? "active" : ""}`}
              onClick={() => setDarkMode((prev) => !prev)}
            >
              {darkMode ? "On" : "Off"}
            </button>
          </div>

          <div className="accessibility-row">
            <span>High contrast</span>
            <button
              className={`accessibility-pill ${highContrast ? "active" : ""}`}
              onClick={() => setHighContrast((prev) => !prev)}
            >
              {highContrast ? "On" : "Off"}
            </button>
          </div>

          <div className="accessibility-row">
            <span>Highlight links</span>
            <button
              className={`accessibility-pill ${highlightLinks ? "active" : ""}`}
              onClick={() => setHighlightLinks((prev) => !prev)}
            >
              {highlightLinks ? "On" : "Off"}
            </button>
          </div>

          <div className="accessibility-row">
            <span>Font scale</span>
            <div className="font-controls">
              <button onClick={decreaseFont}>−</button>
              <span>{fontScale}%</span>
              <button onClick={increaseFont}>+</button>
            </div>
          </div>

          <div className="accessibility-row">
            <span>Reduce motion</span>
            <button
              className={`accessibility-pill ${reduceMotion ? "active" : ""}`}
              onClick={() => setReduceMotion((prev) => !prev)}
            >
              {reduceMotion ? "On" : "Off"}
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
