import { useLocation } from "react-router-dom";
import Header from "./Header.jsx";
import FooterNav from "./FooterNav.jsx";
import "./Layout.css";

export default function Layout({ children }) {
  const { pathname } = useLocation();

  // List of routes where the footer should be hidden
  const hideFooter = ["/login", "/signup"];

  return (
    <div className="app-layout">
      <Header />
      <main className="app-main">{children}</main>
      {!hideFooter.includes(pathname) && <FooterNav />} {/* 👈 hides footer on login/signup */}
    </div>
  );
}
