import Link from "next/link";
import Mark from "./Mark";
import { nav } from "@/content/site";

export default function Header({ page = "home" }: { page?: "home" | "menu" }) {
  const resolveHref = (href: string) =>
    page === "menu" && href.startsWith("#") ? `/${href}` : href;

  return (
    <header className={`site${page === "menu" ? " scrolled" : ""}`} id="hdr">
      <div className="wrap bar">
        <Link
          className="brand"
          href={page === "menu" ? "/" : "#top"}
          aria-label="Black Rose Lounge — home"
        >
          <Mark />
          <span>Black&nbsp;Rose</span>
        </Link>
        <nav className="main" aria-label="Sections">
          {nav.map((n) => {
            const isActive = page === "menu" && n.href === "/menu";
            const target = resolveHref(n.href);
            return target.startsWith("/") && !n.newTab ? (
              <Link
                key={n.href}
                href={target}
                aria-current={isActive ? "page" : undefined}
              >
                {n.label}
              </Link>
            ) : (
              <a
                key={n.href}
                href={target}
                aria-current={isActive ? "page" : undefined}
                {...(n.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {n.label}
              </a>
            );
          })}
        </nav>
        <div className="hdr-acts">
          {page === "menu" ? (
            <Link className="btn mob-menu" href="/">
              ← Lounge
            </Link>
          ) : (
            <a
              className="btn mob-menu"
              href="/menu"
              target="_blank"
              rel="noopener noreferrer"
            >
              Menu
            </a>
          )}
          <Link className="btn solid" href={page === "menu" ? "/#visit" : "#visit"}>
            Reserve <span className="arw">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
