import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="app-footer">
      <p className="footer-text">
        © 2026 Glide+ · v1.0.0 ·{" "}
        <Link to="/privacy" className="footer-link">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link to="/terms" className="footer-link">
          Terms
        </Link>
      </p>
    </footer>
  );
}