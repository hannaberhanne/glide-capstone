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

          {/* LOGIN / LOGOUT SMALL LINK */}
          <div className="header-auth">
            {user ? (
              <button onClick={handleLogout} className="header-logout">
                Logout
              </button>
            ) : (
              <Link to="/login" className="header-logout">
                Log In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="main-content">
        <Outlet />
      </main>
    </>
  );
}
