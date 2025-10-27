import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PlannerPage from "./pages/PlannerPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
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
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
