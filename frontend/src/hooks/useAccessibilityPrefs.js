import { useEffect, useMemo, useState } from "react";

export const DEFAULT_FONT_SCALE = 100;
export const MIN_FONT_SCALE = 80;
export const MAX_FONT_SCALE = 140;

export const getDefaultAccessibilityPrefs = () => ({
  theme: "light",
  fontScale: DEFAULT_FONT_SCALE,
  highContrast: false,
  highlightLinks: false,
  reduceMotion: false,
});

export const getStoredAccessibilityPrefs = () => {
  if (typeof window === "undefined") {
    return getDefaultAccessibilityPrefs();
  }

  const storedFontScale = parseInt(window.localStorage.getItem("fontScale"), 10);

  return {
    theme: window.localStorage.getItem("darkMode") === "true" ? "dark" : "light",
    fontScale: Number.isFinite(storedFontScale) ? storedFontScale : DEFAULT_FONT_SCALE,
    highContrast: window.localStorage.getItem("highContrast") === "true",
    highlightLinks: window.localStorage.getItem("highlightLinks") === "true",
    reduceMotion: window.localStorage.getItem("reduceMotion") === "true",
  };
};

export default function useAccessibilityPrefs() {
  const [prefs, setPrefs] = useState(getStoredAccessibilityPrefs);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", prefs.theme === "dark");
    window.localStorage.setItem("darkMode", String(prefs.theme === "dark"));
  }, [prefs.theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", prefs.highContrast);
    window.localStorage.setItem("highContrast", String(prefs.highContrast));
  }, [prefs.highContrast]);

  useEffect(() => {
    document.documentElement.classList.toggle("highlight-links", prefs.highlightLinks);
    window.localStorage.setItem("highlightLinks", String(prefs.highlightLinks));
  }, [prefs.highlightLinks]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", prefs.reduceMotion);
    window.localStorage.setItem("reduceMotion", String(prefs.reduceMotion));
  }, [prefs.reduceMotion]);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", `${prefs.fontScale}%`);
    window.localStorage.setItem("fontScale", String(prefs.fontScale));
  }, [prefs.fontScale]);

  const api = useMemo(
    () => ({
      prefs,
      setPrefs,
      updatePref: (field, value) => setPrefs((prev) => ({ ...prev, [field]: value })),
      togglePref: (field) => setPrefs((prev) => ({ ...prev, [field]: !prev[field] })),
      increaseFontScale: () =>
        setPrefs((prev) => ({
          ...prev,
          fontScale: Math.min(prev.fontScale + 10, MAX_FONT_SCALE),
        })),
      decreaseFontScale: () =>
        setPrefs((prev) => ({
          ...prev,
          fontScale: Math.max(prev.fontScale - 10, MIN_FONT_SCALE),
        })),
      resetAccessibilityPrefs: () => setPrefs(getDefaultAccessibilityPrefs()),
    }),
    [prefs]
  );

  return api;
}
