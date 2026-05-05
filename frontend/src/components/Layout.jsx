import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import AccessibilityMenu from "./AccessibilityMenu.jsx";
import "./Layout.css";

export default function Layout() {
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get("tab");
  const [sidebarCompact, setSidebarCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("glide_sidebar_compact") === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("glide_sidebar_compact", sidebarCompact ? "1" : "0");
  }, [sidebarCompact]);

  const shellClass = [
    "app-shell",
    location.pathname === "/dashboard" || location.pathname === "/home" ? "app-shell--today" : "",
    sidebarCompact ? "app-shell--compact" : "app-shell--open",
  ]
    .filter(Boolean)
    .join(" ");

  const navItems = [
    {
      to: "/dashboard",
      label: "Home",
      icon: "home",
      active:
        location.pathname === "/dashboard" || location.pathname === "/home",
    },
    { to: "/planner", label: "Planner", icon: "planner", active: location.pathname === "/planner" },
    { to: "/goals", label: "Goals", icon: "goals", active: location.pathname === "/goals" },
    {
      to: "/settings?tab=student",
      label: "Canvas",
      icon: "canvas",
      active: location.pathname === "/settings" && currentTab === "student",
    },
  ];

  const renderIcon = (name) => {
    switch (name) {
      case "home":
        return (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M3 7.4 9 3l6 4.4v6.8a.8.8 0 0 1-.8.8h-2.9V9.9H6.7V15H3.8a.8.8 0 0 1-.8-.8V7.4Z" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case "planner":
        return (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <rect x="3.2" y="3.8" width="11.6" height="11" rx="2.2" stroke="currentColor" strokeWidth="1.55" />
            <path d="M5.5 2.8v2.2M12.5 2.8v2.2M3.6 7.1h10.8M6 9.6h5.8M6 12.1h4.2" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
          </svg>
        );
      case "goals":
        return (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <circle cx="9" cy="9" r="5.6" stroke="currentColor" strokeWidth="1.55" />
            <circle cx="9" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.45" />
            <path d="M13.8 4.2 11.6 6.4" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
          </svg>
        );
      case "canvas":
        return (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <circle cx="9" cy="9" r="1.3" stroke="currentColor" strokeWidth="1.45" />
            <path
              d="M9 3.1 11 5m4 4 .9 2.2-2.2.9M9 14.9 7 13m-4-4-.9-2.2 2.2-.9M13 7l1.7-1.7M11 13l1.7 1.7M5 11l-1.7 1.7M7 5 5.3 3.3"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="9" r="5.2" stroke="currentColor" strokeWidth="1.35" />
          </svg>
        );
      case "settings":
        return (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M4.2 5.3h4.6M11.5 5.3h2.3M9.6 5.3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm4.2 7.4H9.2M6.5 12.7H4.2m4.6 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={shellClass}>
      <aside className="side-spine" aria-label="Primary">
        <div className="side-spine-top">
          <button
            type="button"
            className="side-collapse"
            aria-label={sidebarCompact ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCompact((value) => !value)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M4.2 3.5v9M11.8 3.5v9"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
              {sidebarCompact ? (
                <path
                  d="M6.4 5.3 9.2 8l-2.8 2.7"
                  stroke="currentColor"
                  strokeWidth="1.45"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M9.6 5.3 6.8 8l2.8 2.7"
                  stroke="currentColor"
                  strokeWidth="1.45"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
            {!sidebarCompact ? <span>Glide+</span> : null}
          </button>
        </div>

        <nav className="side-nav" aria-label="Primary">
          {navItems.map((item) => {
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`side-nav-item ${item.active ? "active" : ""}`.trim()}
                data-label={item.label}
                title={sidebarCompact ? item.label : undefined}
                aria-label={item.label}
                aria-current={item.active ? "page" : undefined}
              >
                <span className="side-nav-icon">{renderIcon(item.icon)}</span>
                {!sidebarCompact ? <span className="side-nav-label">{item.label}</span> : null}
                {item.icon === "canvas" ? <span className="side-nav-dot" aria-hidden /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="side-bottom">
          <Link
            to="/settings"
            className={`side-nav-item side-nav-item-settings ${(location.pathname === "/settings" && currentTab !== "student") ? "active" : ""}`.trim()}
            data-label="Settings"
            title={sidebarCompact ? "Settings" : undefined}
            aria-label="Settings"
            aria-current={(location.pathname === "/settings" && currentTab !== "student") ? "page" : undefined}
          >
            <span className="side-nav-icon">{renderIcon("settings")}</span>
            {!sidebarCompact ? <span className="side-nav-label">Settings</span> : null}
          </Link>
        </div>
      </aside>

      <div className="shell-frame">
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      <div className="accessibility-container">
        <AccessibilityMenu />
      </div>
    </div>
  );
}
