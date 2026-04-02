import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
  <footer className="app-footer">
    <p className="footer-text">© 2026 Glide+ · v1.0.0</p>
    <div className="footer-links">
      <Link to="/dashboard" className="footer-link">Dashboard</Link>
      <Link to="/planner" className="footer-link">Planner</Link>
      <Link to="/goals" className="footer-link">Goals</Link>
      <Link to="/profile" className="footer-link">Profile</Link>
    </div>
  </footer>
);
}