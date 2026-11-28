"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Mark from "./Mark";
import { nav } from "@/content/site";

export default function Header() {
  const pathname = usePathname() || "/";
  const isHome = pathname === "/";

  const isActiveHref = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
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
          <Link className="btn solid" href="/visit">
            Reserve <span className="arw">→</span>
          </Link>
        </div>
      </div>

      <nav className="mob-tabs" aria-label="Primary sections">
        <div className="wrap mob-tabs-row">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActiveHref(n.href) ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
