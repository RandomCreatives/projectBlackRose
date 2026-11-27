import Mark from "./Mark";
import { nav } from "@/content/site";

export default function Header() {
  return (
    <header className="site" id="hdr">
      <div className="wrap bar">
        <a className="brand" href="#top" aria-label="Black Rose Lounge — home">
          <Mark />
          <span>Black&nbsp;Rose</span>
        </a>
        <nav className="main" aria-label="Sections">
          {nav.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <a className="btn solid" href="#visit">
          Reserve <span className="arw">→</span>
        </a>
      </div>
    </header>
  );
}
