import React from "react";
import { Link } from "react-router-dom";

export default function Navbar({ user, onLogout, location, onOpenChat }) {
  const links = [
    { to: "/world", label: "World Map" },
    { to: "/tutorial", label: "Tutorial" }
  ];

  return (
    <header className="top-nav">
      <div className="brand-block">
        <h1>Solara</h1>
        <span>City sustainability simulation</span>
      </div>
      <nav>
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-link ${location.pathname.startsWith(link.to) ? "active" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="user-block">
        <button type="button" onClick={onOpenChat} className="chat-btn">
          Open Chat
        </button>
        <span>{user?.username || "Operator"}</span>
        <button type="button" onClick={onLogout} className="ghost-btn">
          Logout
        </button>
      </div>
    </header>
  );
}
