import { Outlet, Link, useLocation } from "react-router-dom";
import AccessibilityMenu from "./AccessibilityMenu.jsx";
import "./Layout.css";

export default function Layout() {
  const location = useLocation();

  return (
    <>
      {/* HEADER */}
      <header className="main-header">
        <div className="header-inner">

          {/* LEFT SIDE LOGO */}
          <Link className="logo" to="/dashboard">
            Glide<span className="plus">+</span>
          </Link>

          {/* NAVIGATION */}
          <nav className="nav-links">

            <Link
              to="/dashboard"
              className={(location.pathname === "/dashboard" || location.pathname === "/home") ? "active" : ""}
            >
              Dashboard
            </Link>

            <Link
              to="/today"
              className={location.pathname === "/today" ? "active" : ""}
            >
              Today
            </Link>

            <Link
              to="/planner"
              className={location.pathname === "/planner" ? "active" : ""}
            >
              Planner
            </Link>

            <Link
              to="/goals"
              className={location.pathname === "/goals" ? "active" : ""}
            >
              Goals
            </Link>

            <Link
              to="/profile"
              className={location.pathname === "/profile" ? "active" : ""}
            >
              Profile
            </Link>

          </nav>

          {/* keeping header clean; accessibility gear sits bottom-right, profile/logout inside settings */}
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="main-content">
        <Outlet />
      </main>

      <div className="accessibility-container">
        <AccessibilityMenu />
      </div>
    </>
  );
}
