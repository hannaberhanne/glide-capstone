import { Link, useLocation } from "react-router-dom";
import "./FooterNav.css";

const ROUTES = [
  { path: "/", label: "Home" },
  { path: "/planner", label: "Calendar" },
  { path: "/dashboard", label: "Dashboard" },
];

export default function FooterNav() {
  const { pathname } = useLocation();

  // show exactly two buttons: all routes except the current one
  const buttons = ROUTES.filter(r => r.path !== pathname).slice(0, 2);

  return (
    <div className="footer-nav">
      <div className="footer-nav-inner">
        {buttons.map((b) => (
          <Link key={b.path} to={b.path} className="footer-btn">
            {b.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
