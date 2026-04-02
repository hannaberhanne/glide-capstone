import { Outlet, Link, useLocation } from "react-router-dom";
import AccessibilityMenu from "./AccessibilityMenu.jsx";
import Footer from "./Footer.jsx";
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
  <svg width="100" height="36" viewBox="0 0 130 44" fill="none">
    <text x="0" y="36" fontFamily="Libre Baskerville,serif" fontStyle="italic" fontWeight="700" fontSize="44" fill="var(--text-color)">G</text>
    <text x="31" y="36" fontFamily="Libre Baskerville,serif" fontWeight="400" fontSize="35" fill="var(--text-color)">lide</text>
    <text x="88" y="30" fontFamily="Libre Baskerville,serif" fontWeight="700" fontSize="18" fill="var(--achievement-color)">+</text>
  </svg>
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

      <Footer />

      <div className="accessibility-container">
        <AccessibilityMenu />
      </div>
    </>
  );
}
