import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import ReserveForm from "@/components/ReserveForm";
import { venue, week, gallery, nightOptions } from "@/content/site";
import { getMenu } from "@/lib/menu";
import MenuSection from "@/components/MenuSection";
import { venueClock, venueStatus, tonightRoom, weekRows } from "@/lib/hours";

export const dynamic = "force-dynamic"; // the open/closed read must never be cached

const TAGLINE_WORDS = [
  "Moody",
  "Intimate",
  "An oasis in hectic Addis",
  "Candles on every table",
  "Expertly crafted",
  "You can actually talk",
];

export default async function Home() {
  const [menu] = await Promise.all([getMenu()]);
  const now = new Date();
  const status = venueStatus(now);
  const room = tonightRoom(now);
  const rows = weekRows();
  const todayDow = venueClock(now).dow;
  const defaultNight =
    nightOptions.find((n) => n.dow === todayDow)?.label ?? nightOptions[0].label;

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
                Two floors above Djibouti Street, behind an unmarked door, a room has been doing the same thing since{" "}
                {venue.since}: sofas deep enough to stay in, candles on every table, and music played at the volume a
                conversation needs.
              </p>
              <p className="rv">
                The mural on the wall is ours — the woman with the rose was painted for this room. Come at six for one
                drink after work. Come at eleven when the room fills.
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

        <MenuSection menu={menu} />

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

        {/* ==================== THE WEEK ==================== */}
        <section className="sec" id="week" style={{ paddingTop: "clamp(56px,8vw,104px)" }}>
          <div className="wrap">
            <p className="eyebrow rv">The week</p>
            <h2 className="rv" style={{ maxWidth: "22ch" }}>
              Three nights, three <em>different</em> rooms.
            </h2>
            <div className="grid3">
              {week.map((n, i) => (
                <article className="card rv" key={n.key} style={{ transitionDelay: `${i * 0.1}s` }}>
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
            <p className="note rv">
              <b>To confirm —</b> this weekly programme is a proposal built from what guests describe in reviews, not a
              published schedule. It needs the owners’ sign-off before it goes live.
            </p>
          </div>
        </section>

        {/* ==================== INSIDE ==================== */}
        <section className="sec" id="gallery" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <p className="eyebrow rv">Inside</p>
            <div className="gal">
              <figure className="frame rv">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gallery[0].src} alt={gallery[0].alt} width={900} height={675} loading="lazy" />
                <figcaption className="cap">
                  <span>{gallery[0].cap}</span>
                  <b>{gallery[0].tag}</b>
                </figcaption>
              </figure>
              <div className="col">
                <figure className="frame rv" style={{ transitionDelay: ".1s" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gallery[1].src} alt={gallery[1].alt} width={900} height={1349} loading="lazy" />
                  <figcaption className="cap">
                    <span>{gallery[1].cap}</span>
                    <b>{gallery[1].tag}</b>
                  </figcaption>
                </figure>
                <figure className="frame rv" style={{ transitionDelay: ".18s" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gallery[2].src} alt={gallery[2].alt} width={600} height={600} loading="lazy" />
                  <figcaption className="cap">
                    <span>{gallery[2].cap}</span>
                    <b>{gallery[2].tag}</b>
                  </figcaption>
                </figure>
              </div>
            </div>
            <p className="note rv">
              <b>Imagery —</b> the mural is the venue’s own artwork, photographed for the brand system. Room and detail
              shots are to be replaced with the owners’ photography on the night the shoot happens.
            </p>
          </div>
        </section>

        {/* ==================== RESERVE ==================== */}
        <section className="reserve" id="visit">
          <div className="bg" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/room.jpg" alt="" width={900} height={675} loading="lazy" />
          </div>
          <div className="wrap">
            <div className="panel rv">
              <div>
                <p className="eyebrow">Reserve</p>
                <h2>
                  Hold a table
                  <br />
                  for the evening.
                </h2>
                <p style={{ marginBottom: 22 }}>
                  Tell us the night and the number. We hold the table until nine, and we call back within the hour we
                  are open.
                </p>
                <ReserveForm defaultNight={defaultNight} />
              </div>

              <div className="info">
                <dl>
                  <dt>Address</dt>
                  <dd>
                    <b>{venue.address.line1}</b>
                    <br />
                    {venue.address.line2}, {venue.address.city}
                    <br />
                    <span style={{ color: "var(--mute)", fontSize: 12.5 }}>
                      {venue.address.landmark} · parking in the plaza
                    </span>
                    <br />
                    <a href={venue.directionsUrl} target="_blank" rel="noopener noreferrer">
                      Directions ↗
                    </a>
                  </dd>

                  <dt>Hours</dt>
                  <dd>
                    <table className="week">
                      <caption className="sr-only">Opening hours for each day of the week</caption>
                      <thead>
                        <tr>
                          <th scope="col">Days</th>
                          <th scope="col">Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr
                            key={r.window}
                            className={r.dows.includes(todayDow) ? "is-today" : undefined}
                          >
                            <td>
                              <b>{r.days.join(" · ")}</b>
                            </td>
                            <td>{r.window}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <span style={{ display: "block", marginTop: -8, fontSize: 12, color: "var(--mute)" }}>
                      Kitchen and bar both stop 30 minutes before close.
                    </span>
                  </dd>

                  <dt>Dress</dt>
                  <dd>
                    <b>{venue.dress.short}</b>
                    <br />
                    {venue.dress.long}
                  </dd>

                  <dt>Private hire</dt>
                  <dd>
                    The salon seats eight. <b>Ask at the door, or call ahead.</b>
                  </dd>

                  <dt>Talk to us</dt>
                  <dd>
                    {venue.phones.map((p) => (
                      <span key={p.tel} style={{ display: "block" }}>
                        <a href={`tel:${p.tel}`}>{p.label}</a>
                      </span>
                    ))}
                    <a href={`mailto:${venue.email}`}>{venue.email}</a>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <a className="pill" href="#visit" id="pill">
        Reserve a table
      </a>
    </>
  );
}
