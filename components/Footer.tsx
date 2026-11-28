import Link from "next/link";
import Mark from "./Mark";
import InstallAppTrigger from "./InstallAppTrigger";
import { venue, nav } from "@/content/site";
import { venueStatus } from "@/lib/hours";
import { getGallery } from "@/lib/gallery";

export default async function Footer() {
  const status = venueStatus();
  const { socials } = await getGallery();
  const socialLinks =
    socials.length > 0
      ? socials.map((s) => ({ label: s.label, href: s.url }))
      : venue.socials;

  return (
    <footer className="site">
      <div className="wrap">
        <div className="foot">
          <div>
            <Link className="brand" href="/" aria-label="Black Rose Lounge — home">
              <Mark />
              <span>Black&nbsp;Rose</span>
            </Link>
            <p style={{ fontSize: 13, color: "#97897A", marginTop: 14, maxWidth: "28ch" }}>
              A candlelit cocktail room in Suite 201 on Djibouti Street. Open since {venue.since}.
            </p>
            <p style={{ fontSize: 11.5, color: "#A2937F", marginTop: 6 }}>
              <span className="dot" aria-hidden="true" style={{ verticalAlign: 0 }} />
              {status.headline} · {status.detail}
            </p>
          </div>
          <div className="cols">
            <div>
              <h4>Explore</h4>
              {nav.map((n) => (
                <Link key={n.href} href={n.href}>
                  {n.label}
                </Link>
              ))}
            </div>
            <div>
              <h4>Socials</h4>
              {socialLinks.map((s) => (
                <a key={`${s.label}-${s.href}`} href={s.href} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              ))}
              <a href={venue.mapUrl} target="_blank" rel="noopener noreferrer">
                Map
              </a>
              <InstallAppTrigger />
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
          © {new Date().getFullYear()} {venue.name} · {venue.address.line1}, {venue.address.city} ·{" "}
          {venue.dress.short}
        </div>
      </div>
    </footer>
  );
}
