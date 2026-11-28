import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { week, specialNights } from "@/content/site";
import { venueStatus, tonightRoom } from "@/lib/hours";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Week",
  description:
    "Weekly rhythm and special nights at Black Rose Lounge — Tuesday vinyl, Thursday salon, Every Friday Happy Hour (5:00–7:30 pm), and late weekend DJ sets.",
  alternates: { canonical: "/week" },
};

export default function WeekPage() {
  const now = new Date();
  const status = venueStatus(now);
  const room = tonightRoom(now);

  return (
    <>
      <Header />
      <main id="main">
        <section className="sec page-top">
          <div className="wrap">
            <p className="eyebrow rv">The week &amp; events</p>
            <h1 className="page-title rv">
              Every night has its own <em>tempo</em>.
            </h1>
            <p className="lede rv" style={{ marginBottom: 28 }}>
              Quiet vinyl early in the week, Every Friday Happy Hour from five, and late sets once the room fills.
              Regular nights and special evenings all live right here.
            </p>

            <div className="tonight-bar rv">
              <div>
                <div className="k">{status.headline}</div>
                <div className="v">
                  <span className="dot" aria-hidden="true" />
                  <span>{status.window}</span>
                </div>
              </div>
              <div>
                <div className="k">Tonight&apos;s room</div>
                <div className="v">{room}</div>
              </div>
              <div>
                <Link className="btn solid" href="/visit">
                  Reserve tonight <span className="arw">→</span>
                </Link>
              </div>
            </div>

            <div className="grid-week">
              {week.map((n, i) => (
                <article className="card rv" key={n.key} style={{ transitionDelay: `${i * 0.08}s` }}>
                  <div className="k">{n.day}</div>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                  <div className="price">
                    <span>{n.meta}</span>
                    <em>{n.badge}</em>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="sec" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <p className="eyebrow rv">Special nights &amp; gatherings</p>
            <h2 className="rv" style={{ maxWidth: "24ch" }}>
              Hosted tables, Happy Hour &amp; <em>late sessions</em>.
            </h2>

            <div className="grid3">
              {specialNights.map((ev, i) => (
                <article className="card rv" key={ev.key} style={{ transitionDelay: `${i * 0.09}s` }}>
                  <div className="k">{ev.when}</div>
                  <h3>{ev.title}</h3>
                  <p>{ev.body}</p>
                  <div className="price">
                    <span>{ev.meta}</span>
                    <Link href={ev.ctaHref} className="inline-link">
                      {ev.ctaLabel} →
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <p className="note rv">
              <b>Every Friday Happy Hour (5:00 pm – 7:30 pm)</b> is confirmed on our lounge signage. Weekly theme
              nights are tailored seasonally — check our{" "}
              <Link href="/gallery" style={{ color: "var(--ochre)" }}>
                Gallery &amp; Socials
              </Link>{" "}
              or call ahead for tonight&apos;s set.
            </p>
          </div>
        </section>
      </main>

      <Footer />
      <Link className="pill" href="/visit" id="pill">
        Reserve a table
      </Link>
    </>
  );
}
