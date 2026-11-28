"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import Mark from "./Mark";
import { nav } from "@/content/site";

function NavIcon({ href }: { href: string }) {
  switch (href) {
    case "/":
      // Salon arch + candle flame
      return (
        <svg
          viewBox="0 0 24 24"
          width="19"
          height="19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 20V11a7 7 0 0 1 14 0v9" />
          <path d="M3.5 20h17" />
          <path d="M12 13.5v3.5" />
          <path d="M12 9.4c.8 1 .95 1.85 0 2.55-.95-.7-.8-1.55 0-2.55Z" />
        </svg>
      );
    case "/menu":
      // Open flipbook menu
      return (
        <svg
          viewBox="0 0 24 24"
          width="19"
          height="19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 6.5C10 5 7 4.75 4 5.5v13c3-.75 6-.5 8 1 2-1.5 5-1.75 8-1v-13c-3-.75-6-.5-8 1Z" />
          <path d="M12 6.5v13" />
        </svg>
      );
    case "/week":
      // After-dark crescent & evening star
      return (
        <svg
          viewBox="0 0 24 24"
          width="19"
          height="19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z" />
          <path d="M16.5 4.5v3M15 6h3" />
        </svg>
      );
    case "/gallery":
      // Minimalist framed gallery
      return (
        <svg
          viewBox="0 0 24 24"
          width="19"
          height="19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
          <circle cx="9.25" cy="9.5" r="1.35" />
          <path d="m4.5 17 4.6-4.4a1.4 1.4 0 0 1 1.95.04L14 15.5l1.9-1.8a1.4 1.4 0 0 1 1.94.03L20 15.8" />
        </svg>
      );
    case "/visit":
    default:
      // Minimalist location pin
      return (
        <svg
          viewBox="0 0 24 24"
          width="19"
          height="19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20.5s6.5-5.6 6.5-10.75a6.5 6.5 0 1 0-13 0C5.5 14.9 12 20.5 12 20.5Z" />
          <circle cx="12" cy="9.75" r="2.2" />
        </svg>
      );
  }
}

export default function Header() {
  const pathname = usePathname() || "/";
  const isHome = pathname === "/";

  const isActiveHref = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const activeIndex = nav.findIndex((n) => isActiveHref(n.href));

  return (
    <>
      <header className={`site${isHome ? "" : " scrolled"}`} id="hdr">
        <div className="wrap bar">
          <Link className="brand" href="/" aria-label="Black Rose Lounge — home">
            <Mark />
            <span>Black&nbsp;Rose</span>
          </Link>

          <nav className="main" aria-label="Primary navigation">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActiveHref(n.href) ? "page" : undefined}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="hdr-acts">
            <Link className="btn solid hdr-reserve" href="/visit">
              Reserve <span className="arw">→</span>
            </Link>
          </div>
        </div>
      </header>

      <nav className="glass-dock" aria-label="Primary sections">
        <div
          className="glass-dock-shell"
          style={
            {
              "--dock-count": nav.length,
              "--dock-active": activeIndex >= 0 ? activeIndex : 0,
            } as CSSProperties
          }
        >
          {activeIndex >= 0 ? (
            <span className="glass-dock-lens" aria-hidden="true" />
          ) : null}

          {nav.map((n) => {
            const active = isActiveHref(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`glass-dock-item${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="glass-dock-ico">
                  <NavIcon href={n.href} />
                </span>
                <span className="glass-dock-lbl">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
