"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { venue } from "@/content/site";
import { tonightRoom, type Status } from "@/lib/hours";

export default function Hero({ initial, initialRoom }: { initial: Status; initialRoom: string }) {
  // the room programme follows the venue clock; the open status never changes
  const [room, setRoom] = useState(initialRoom);

  useEffect(() => {
    const tick = () => setRoom(tonightRoom());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hero" id="top">
      <div className="hero-wm" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wm-wide" src="/img/watermark.jpg" alt="" width={1600} height={1600} fetchPriority="high" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wm-tall" src="/img/profile.jpg" alt="" width={900} height={1349} fetchPriority="high" />
      </div>
      <div className="hero-veil" aria-hidden="true" />

      <div className="wrap">
        <p className="kicker rv">Djibouti Street · Addis Ababa · since {venue.since}</p>
        <h1>
          <span className="line">
            <span>Candlelight, a</span>
          </span>
          <span className="line">
            <span>properly made</span>
          </span>
          <span className="line">
            <span>cocktail, and a</span>
          </span>
          <span className="line">
            <span>conversation you</span>
          </span>
          <span className="line">
            <span>
              can <em>actually</em> hear.
            </span>
          </span>
        </h1>

        <div className="cta rv" style={{ transitionDelay: ".5s" }}>
          <Link className="btn solid" href="/visit">
            Reserve a table <span className="arw">→</span>
          </Link>
          <Link className="btn" href="/menu">
            Open the menu
          </Link>
        </div>

        <div className="tonight rv" style={{ transitionDelay: ".72s" }}>
          <div className="inner">
            <div>
              <div className="k">Find us</div>
              <div className="v">
                {venue.address.line1}
                <br />
                <small style={{ whiteSpace: "nowrap" }}>{venue.address.line2}</small>
              </div>
            </div>
            <div>
              <div className="k">{initial.headline}</div>
              <div className="v">
                <span className="dot" aria-hidden="true" />
                <span>{initial.window}</span>
              </div>
            </div>
            <div>
              <div className="k">Tonight’s room</div>
              <div className="v">{room}</div>
            </div>
            <div>
              <div className="k">Guests say</div>
              <div className="v">
                <span className="stars" aria-hidden="true">
                  ★★★★★
                </span>{" "}
                {venue.ratings.google.score} · {venue.ratings.google.count}
                <span className="sr-only">
                  {venue.ratings.google.score} out of 5, {venue.ratings.google.count} Google reviews
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cue" aria-hidden="true">
        <span>Scroll</span>
        <i />
      </div>
    </div>
  );
}
