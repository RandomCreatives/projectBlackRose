import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import OfflineActions from "@/components/OfflineActions";
import { venue } from "@/content/site";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="sec page-top">
          <div className="wrap" style={{ maxWidth: 680 }}>
            <p className="eyebrow">Offline mode</p>
            <h1 className="page-title">
              No signal right <em>now</em>.
            </h1>
            <p className="lede" style={{ marginBottom: 24 }}>
              You appear to be offline. Any pages you opened earlier — including the menu — remain available on your
              device, and you can always reach Suite 201 directly by phone.
            </p>

            <OfflineActions />

            <div className="card" style={{ marginTop: 28 }}>
              <div className="k">Find &amp; call Black Rose</div>
              <h2 style={{ fontSize: 24, marginBottom: 14 }}>{venue.address.line1}</h2>
              <p style={{ marginBottom: 10 }}>
                {venue.address.line2}, {venue.address.city} · {venue.address.landmark}
              </p>
              <p style={{ marginBottom: 14 }}>
                <strong style={{ color: "var(--cream)", fontWeight: 500 }}>Open every day from 5:00 pm</strong>
                <br />
                Tue–Sat 5:00 pm – 2:00 am · Sun &amp; Mon 5:00 pm – 12:30 am · Every Friday Happy Hour 5:00–7:30 pm
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {venue.phones.map((p) => (
                  <a key={p.tel} href={`tel:${p.tel}`} className="btn">
                    Call {p.label}
                  </a>
                ))}
                <Link href="/menu" className="btn">
                  Try saved menu
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
