import Mark from "./Mark";
import { venue, nav } from "@/content/site";
import { venueStatus } from "@/lib/hours";

export default function Footer() {
  const status = venueStatus();
  return (
    <footer className="site">
      <div className="wrap">
        <div className="foot">
          <div>
            <a className="brand" href="#top" aria-label="Black Rose Lounge — back to top">
              <Mark />
              <span>Black&nbsp;Rose</span>
            </a>
            <p style={{ fontSize: 13, color: "#97897A", marginTop: 14, maxWidth: "26ch" }}>
              A candlelit cocktail room on Djibouti Street. Open since {venue.since}.
            </p>
            <p style={{ fontSize: 11.5, color: "#A2937F", marginTop: 6 }}>
              <span className="dot" aria-hidden="true" style={{ verticalAlign: 0 }} />
              {status.headline} · {status.detail}
            </p>
          </div>
          <div className="cols">
            <div>
              <h4>Visit</h4>
              {nav.map((n) => (
                <a key={n.href} href={n.href}>
                  {n.label}
                </a>
              ))}
              <a href="/menu">Digital Menu</a>
            </div>
            <div>
              <h4>Elsewhere</h4>
              {venue.socials.map((s) => (
                <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              ))}
              <a href={venue.mapUrl} target="_blank" rel="noopener noreferrer">
                Map
              </a>
            </div>
            <div>
              <h4>Contact</h4>
              {venue.phones.map((p) => (
                <a key={p.tel} href={`tel:${p.tel}`}>
                  {p.label}
                </a>
              ))}
              <a href={`mailto:${venue.email}`}>{venue.email}</a>
            </div>
          </div>
        </div>
        <div className="fine2">
          © {new Date().getFullYear()} {venue.name} · {venue.address.city} · {venue.dress.short}
        </div>
      </div>
    </footer>
  );
}
