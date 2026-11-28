import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReserveForm from "@/components/ReserveForm";
import { venue, nightOptions } from "@/content/site";
import { venueClock, weekRows } from "@/lib/hours";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find Us & Reserve",
  description:
    "Reserve a table at Black Rose Lounge — Yegemiya Plaza, 2nd floor, Suite 201, Djibouti Street, Addis Ababa. Open every evening from 5:00 pm.",
  alternates: { canonical: "/visit" },
};

export default function VisitPage() {
  const now = new Date();
  const rows = weekRows();
  const todayDow = venueClock(now).dow;
  const defaultNight =
    nightOptions.find((n) => n.dow === todayDow)?.label ?? nightOptions[0].label;

  return (
    <>
      <Header />
      <main id="main">
        <section className="reserve page-top" id="visit">
          <div className="bg" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/room.jpg" alt="" width={900} height={675} />
          </div>
          <div className="wrap">
            <div className="panel rv">
              <div>
                <p className="eyebrow">Find us &amp; reserve</p>
                <h1 className="panel-title">
                  Hold a table
                  <br />
                  for the <em>evening</em>.
                </h1>
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
                      Every Friday Happy Hour 5:00 pm – 7:30 pm · Kitchen &amp; bar stop 30 minutes before close.
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
                    The corner banquette &amp; salon seat eight. <b>Ask at the door, or call ahead.</b>
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
    </>
  );
}
