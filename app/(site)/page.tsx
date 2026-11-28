import Link from "next/link";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import { venue, week } from "@/content/site";
import { getGallery } from "@/lib/gallery";
import { venueStatus, tonightRoom } from "@/lib/hours";

export const dynamic = "force-dynamic"; // the room programme follows the venue clock

const TAGLINE_WORDS = [
  "Moody",
  "Intimate",
  "An oasis in hectic Addis",
  "Candles on every table",
  "Expertly crafted",
  "You can actually talk",
];

export default async function Home() {
  const [{ photos }] = await Promise.all([getGallery()]);
  const now = new Date();
  const status = venueStatus(now);
  const room = tonightRoom(now);
  const previewPhotos = photos.slice(0, 3);

  return (
    <>
      <Header />
      <main id="main">
        <Hero initial={status} initialRoom={room} />

        <div className="marq" aria-hidden="true">
          <div className="track">
            {[0, 1].flatMap((k) => TAGLINE_WORDS.map((w) => <span key={`${w}-${k}`}>{w}</span>))}
          </div>
        </div>

        {/* ==================== THE ROOM ==================== */}
        <section className="sec" id="room">
          <div className="wrap two">
            <div>
              <p className="eyebrow rv">The room</p>
              <h2 className="rv">
                Low light, painted walls, and a bar that takes <em>its time</em>.
              </h2>
              <p className="lede rv">
                Two floors above Djibouti Street, behind the velvet drapes of Suite 201, a room has been doing the same
                thing since {venue.since}: velvet seating deep enough to stay in, candles on every table, and music
                played at the volume a conversation needs.
              </p>
              <p className="rv">
                The mural on the wall is ours — the woman with the rose was painted for this room. Come at five for a
                quiet first drink or Friday Happy Hour. Come after ten when the room fills.
              </p>
              <div className="mini rv">
                <div>
                  <div className="n">{new Date().getFullYear() - venue.since}</div>
                  <div className="l">Years in this room</div>
                </div>
                <div>
                  <div className="n">{venue.ratings.google.score}</div>
                  <div className="l">Google rating</div>
                </div>
                <div>
                  <div className="n">#1</div>
                  <div className="l">Bar in Addis, Wanderlog</div>
                </div>
              </div>
            </div>
            <figure className="frame tall mural rv" style={{ transitionDelay: ".12s" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/figure.jpg" alt="The painted figure holding a black rose" width={900} height={1679} loading="lazy" />
              <figcaption className="cap">
                <span>The mural</span>
                <b>Painted for us</b>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ==================== REAL ROOM PREVIEW ==================== */}
        {previewPhotos.length > 0 ? (
          <section className="sec" style={{ paddingTop: 0 }}>
            <div className="wrap">
              <div className="sec-head rv">
                <div>
                  <p className="eyebrow">Inside Suite 201</p>
                  <h2>
                    Candlelight, velvet &amp; <em>terracotta</em>.
                  </h2>
                </div>
                <Link className="btn" href="/gallery">
                  Full gallery &amp; socials <span className="arw">→</span>
                </Link>
              </div>

              <div className="gal-preview">
                {previewPhotos.map((p, idx) => (
                  <Link
                    key={p.id}
                    href="/gallery"
                    className={`frame rv${idx === 0 ? " gal-lead" : ""}`}
                    style={{ transitionDelay: `${idx * 0.08}s` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image_url} alt={p.alt || p.title} loading="lazy" />
                    <span className="cap">
                      <span>{p.title}</span>
                      {p.tag ? <b>{p.tag}</b> : null}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ==================== QUOTE BAND ==================== */}
        <div className="band">
          <div className="wm" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/watermark.jpg" alt="" width={1600} height={1600} loading="lazy" />
          </div>
          <div className="wrap rv">
            <blockquote>
              “An oasis in <em>hectic</em> Addis Ababa.”
            </blockquote>
            <cite>Google review · 2025</cite>
          </div>
        </div>

        {/* ==================== EXPLORE BY TAB ==================== */}
        <section className="sec">
          <div className="wrap">
            <p className="eyebrow rv">Explore Black Rose</p>
            <h2 className="rv" style={{ maxWidth: "24ch" }}>
              Choose your evening from <em>the top</em>.
            </h2>
            <div className="grid3">
              <Link className="card card-link rv" href="/menu">
                <div className="k">Interactive flipbook</div>
                <h3>The Menu</h3>
                <p>
                  125 cocktails, Ethiopian &amp; sparkling wines, single malts, kitchen plates, and our Friday Happy
                  Hour chapter.
                </p>
                <div className="price">
                  <span>Open flipbook</span>
                  <em>→</em>
                </div>
              </Link>

              <Link className="card card-link rv" href="/week" style={{ transitionDelay: ".09s" }}>
                <div className="k">Nights &amp; events</div>
                <h3>The Week</h3>
                <p>
                  {week.length} signature evenings — Tuesday vinyl, Thursday salon, Friday Happy Hour 5–7:30pm, and
                  late weekend sets.
                </p>
                <div className="price">
                  <span>See the schedule</span>
                  <em>→</em>
                </div>
              </Link>

              <Link className="card card-link rv" href="/visit" style={{ transitionDelay: ".18s" }}>
                <div className="k">Suite 201 · Djibouti Street</div>
                <h3>Find Us &amp; Reserve</h3>
                <p>
                  Hold a table for the evening, check tonight&apos;s hours, or reserve the terracotta corner banquette for
                  up to eight.
                </p>
                <div className="price">
                  <span>Hold a table</span>
                  <em>→</em>
                </div>
              </Link>
            </div>
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
