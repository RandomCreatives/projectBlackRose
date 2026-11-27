import type { Menu } from "@/lib/menu";
import DigitalMenuBook from "./DigitalMenuBook";

export default function MenuSection({ menu }: { menu: Menu }) {
  return (
    <section className="sec" id="menu" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <p className="eyebrow rv">The menu</p>
        <h2 className="rv" style={{ maxWidth: "22ch" }}>
          One house cocktail, and a cellar book done <em>properly</em>.
        </h2>
        <p className="lede rv" style={{ marginBottom: 28 }}>
          Open the flipbook to browse cocktails, Ethiopian &amp; sparkling wines, spirits, single malts, kitchen
          plates, cold beers, and Friday Happy Hour.
        </p>

        <div className="rv">
          <DigitalMenuBook categories={menu.categories} variant="embedded" />
        </div>

        <div className="rv" style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a className="btn solid" href="#visit">
            Reserve for the evening <span className="arw">→</span>
          </a>
          <a
            className="btn"
            href="/menu"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open full-screen flipbook <span className="arw">↗</span>
          </a>
        </div>

        {menu.source === "fallback" ? (
          <p className="note rv">
            <b>Menu —</b> the full list is temporarily unavailable. The Black Rose is the house cocktail and is
            always on.
          </p>
        ) : (
          <p className="note rv">
            <b>Pricing —</b> all prices are in Ethiopian Birr (ETB) and include 15% VAT &amp; 5% Service Charge.
            Two-column chapters list Shot &amp; Bottle prices (or Full &amp; Half portions); ochre lines note
            Friday Happy Hour.
          </p>
        )}
      </div>
    </section>
  );
}
