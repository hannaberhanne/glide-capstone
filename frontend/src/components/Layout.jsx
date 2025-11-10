import { Outlet, Link } from "react-router-dom";
import "./Layout.css";

export default function Layout() {
  return (
    <>
      <header className="main-header">
        <div className="header-inner">
          <Link to="/" className="logo">
            Glide<span className="plus">+</span>
          </Link>
          <nav className="nav-links">
            <Link to="/home">Home</Link>
            <Link to="/planner">Planner</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/login" className="login-btn">
              Log In / Logout
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </>
  );
}