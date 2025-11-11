import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PlannerPage from "./pages/PlannerPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import "./App.css";

function NotFound() {
  return (
    <div style={{ padding: 24 }}>
      <h1>404 — Page Not Found</h1>
      <a href="/">Go back home</a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public pages — no navbar, no layout */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* All other routes inside Layout (with navbar/footer) */}
      <Route element={<Layout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/planner" element={<PlannerPage />} />
      </Route>

      {/* 404 fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}