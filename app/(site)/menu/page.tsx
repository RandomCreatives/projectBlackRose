import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DigitalMenuBook from "@/components/DigitalMenuBook";
import { getMenu } from "@/lib/menu";
import { venueStatus } from "@/lib/hours";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Browse the Black Rose Lounge interactive flipbook menu — cocktails, Ethiopian wines & champagne, spirits, whisky & cognac, kitchen plates, beers, and Friday Happy Hour.",
  alternates: { canonical: "/menu" },
};

export default async function DigitalMenuPage() {
  const menu = await getMenu();
  const status = venueStatus();

  return (
    <>
      <Header />
      <main id="main" className="menu-page-shell">
        <div className="wrap">
          <div className="menu-page-status">
            <span>
              <span className="dot" aria-hidden="true" />
              <b>{status.headline}</b> · {status.window}
            </span>
            <span className="menu-page-hint">
              Interactive flipbook · Drag a corner, swipe, or tap a chapter
            </span>
          </div>

          <DigitalMenuBook categories={menu.categories} variant="standalone" />

          <p className="note" style={{ marginTop: 22 }}>
            <b>Pricing —</b> all prices are in Ethiopian Birr (ETB) and include 15% VAT &amp; 5% Service Charge.
            Two-column chapters list Shot &amp; Bottle prices (or Full &amp; Half portions); ochre lines mark Every
            Friday Happy Hour (5:00 pm – 7:30 pm).
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
