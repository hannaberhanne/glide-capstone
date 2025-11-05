import { Link, useNavigate } from "react-router-dom";
import "./Header.css";

export default function Header() {
  const nav = useNavigate();

  function handleLogout() {
    // placeholder logout behavior
    alert("Logging out (stub). Redirecting to Login...");
    nav("/login");
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          Glide<span>+</span>
        </Link>

        <nav className="header-nav">
          <button className="header-btn" onClick={handleLogout}>
            Login / Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
