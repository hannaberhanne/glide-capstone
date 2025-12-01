import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth } from "../config/firebase.js";
import "./Layout.css";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Fetch user info when logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <>
      {/* HEADER */}
      <header className="main-header">
        <div className="header-inner">

          {/* LEFT SIDE LOGO */}
          <Link className="logo" to="/home">
            Glide<span className="plus">+</span>
          </Link>

          {/* NAVIGATION */}
          <nav className="nav-links">

            <Link
              to="/home"
              className={
                location.pathname === "/home" || location.pathname === "/" ? "active" : ""
              }
            >
              Home
            </Link>

            <Link
              to="/planner"
              className={location.pathname === "/planner" ? "active" : ""}
            >
              Planner
            </Link>

            <Link
              to="/dashboard"
              className={location.pathname === "/dashboard" ? "active" : ""}
            >
              Dashboard
            </Link>

            {/* ⭐ NEW SETTINGS LINK */}
            <Link
              to="/settings"
              className={location.pathname === "/settings" ? "active" : ""}
            >
              Settings
            </Link>

            {/* LOGIN / LOGOUT BUTTON */}
            {user ? (
              <button onClick={handleLogout} className="header-btn">
                Logout
              </button>
            ) : (
              <Link to="/login" className="header-btn">
                Log In
              </Link>
            )}

          </nav>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="main-content">
        <Outlet />
      </main>
    </>
  );
}
