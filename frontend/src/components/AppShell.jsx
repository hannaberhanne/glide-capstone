import useAccessibilityPrefs from "../hooks/useAccessibilityPrefs.js";

// keep the root accessibility hook here so main.jsx stays clean
// and the html classes land before the app really paints.
export default function AppShell({ children }) {
  useAccessibilityPrefs();
  return children;
}
