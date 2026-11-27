import type { Metadata } from "next";
import Link from "next/link";
import Mark from "@/components/Mark";
import DigitalMenuBook from "@/components/DigitalMenuBook";
import { getMenu } from "@/lib/menu";
import { venueStatus } from "@/lib/hours";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Digital Menu",
  description:
    "Browse the Black Rose Lounge digital menu — cocktails, shots, Ethiopian wines, champagne, kitchen plates, single shot & full bottle spirits, and Friday Happy Hour.",
  alternates: { canonical: "/menu" },
};

export default async function DigitalMenuPage() {
  const [menu] = await Promise.all([getMenu()]);
  const status = venueStatus();
  const dotClass = status.open
    ? status.closesSoon
      ? "dot soon"
      : "dot"
    : "dot shut";

  return (
    <main id="main" className="menu-page-shell">
      <div className="wrap">
        <header className="menu-page-top">
          <Link href="/" className="brand" aria-label="Black Rose Lounge — back to main site">
            <Mark />
            <span>Black&nbsp;Rose</span>
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                color: "var(--ash)",
                letterSpacing: "0.08em",
              }}
            >
              <span className={dotClass} aria-hidden="true" />
              {status.headline} · {status.window}
            </span>
            <Link href="/" className="menu-page-back">
              ← Back to lounge
            </Link>
            <Link href="/#visit" className="btn solid" style={{ minHeight: 40, padding: "10px 18px" }}>
              Reserve <span className="arw">→</span>
            </Link>
          </div>
        </header>

        <DigitalMenuBook categories={menu.categories} variant="standalone" />
      </div>
    </main>
  );
}
