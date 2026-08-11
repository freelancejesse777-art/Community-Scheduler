"use client";
import { useState } from "react";

export default function Nav() {
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/connect", label: "Connections" },
    { href: "/compose", label: "Compose" },
    { href: "/queue", label: "Queue" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/billing", label: "Billing" },
    { href: "/login", label: "Login" },
  ];

  return (
    <nav className="topnav">
      <div className="topnav-row">
        <a href="/" className="brand">community-scheduler</a>
        <button
          type="button"
          className="nav-toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="navlinks navlinks-desktop">
          {links.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </div>
      </div>
      {open && (
        <div className="navlinks navlinks-mobile">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
