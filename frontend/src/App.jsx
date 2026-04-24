import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PlannerPage from "./pages/PlannerPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import OnboardingPage from "./pages/OnboardingPage";
import CanvasSetup from "./pages/CanvasSetup";
import SettingsPage from "./pages/SettingsPage.jsx";   
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DemoPage from "./pages/DemoPage.jsx";
import GoalsPage from "./pages/GoalsPage.jsx";
import "./App.css";

function NotFound() {
  return (
    <div style={{ padding: 24 }}>
      <h1>404 — Page Not Found</h1>
      <a href="/">Go back home</a>
    </div>
  );
}

function LegacyProfileRedirect() {
  const location = useLocation();
  return <Navigate to={`/settings${location.search || ""}`} replace />;
}

export default function App() {
  return (
    <Routes>

      {/* Public pages — no navbar, no layout */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/canvas-setup" element={<CanvasSetup />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/demo" element={<DemoPage />} />

      {/* Authenticated pages — wrapped in Layout */}
      <Route element={<Layout />}>
        <Route path="/home" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/goals" element={<GoalsPage />} />

        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<LegacyProfileRedirect />} />

      </Route>

      {/* 404 fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
