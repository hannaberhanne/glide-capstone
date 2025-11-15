import { Outlet, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase.js";
import "./Layout.css";

export default function Layout() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      nav("/login");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  return (
    <>
      <header className="main-header">
        <div className="header-inner">
          <Link to="/home" className="logo">
            Glide<span className="plus">+</span>
          </Link>
          <nav className="nav-links">
            <Link to="/home">Home</Link>
            <Link to="/planner">Planner</Link>
            <Link to="/dashboard">Dashboard</Link>
            {user ? (
              <button onClick={handleLogout} className="login-btn">
                Logout
              </button>
            ) : (
              <Link to="/login" className="login-btn">
                Log In
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </>
  );
}