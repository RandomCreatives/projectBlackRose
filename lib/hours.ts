import { hours } from "@/content/site";

/** The venue runs on East Africa Time: UTC+3, no daylight saving. Fixed offset, no tz database needed. */
export const VENUE_TZ = "Africa/Addis_Ababa";
const VENUE_OFFSET_MIN = 180;

export type VenueClock = { dow: number; minutes: number };

/** Convert an absolute instant into the venue's wall clock. */
export function venueClock(at: Date = new Date()): VenueClock {
  const utc = at.getTime() + at.getTimezoneOffset() * 60_000;
  const local = new Date(utc + VENUE_OFFSET_MIN * 60_000);
  return {
    dow: local.getUTCDay(),
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

const h = (mins: number) => {
  const m = ((mins % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = hh < 12 ? "am" : "pm";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm === 0
    ? `${h12}${suffix}`
    : `${h12}:${String(mm).padStart(2, "0")}${suffix}`;
};

export const timeLabel = h;

export type Status = {
  open: boolean;
  headline: string;
  /** one line of supporting detail */
  detail: string;
  /** e.g. "5:00pm — 2:00am" for the current venue day */
  window: string;
  closesAt: string | null;
  closesSoon: boolean;
};

/**
 * The badge never reads "Closed": a closed state makes the house feel inactive
 * even between shifts. It stays positive, while the real 5pm doors-open time is
 * published in the hours table and in `openingHoursSpecification` for Google.
 */
export function venueStatus(_at?: Date): Status {
  return {
    open: true,
    headline: "Open",
    detail: "Every day from 5pm",
    window: "Every day from 5pm",
    closesAt: null,
    closesSoon: false,
  };
}

/** Tonight's programme line for the hero card. */
const rooms: Record<number, string> = {
  0: "No DJ. The quiet room.",
  1: "No DJ. The quiet room.",
  2: "Vinyl & conversation",
  3: "Cocktail hour",
  4: "The salon",
  5: "DJ after 10pm",
  6: "DJ after 10pm",
};

export const tonightRoom = (at: Date = new Date()) =>
  rooms[venueClock(at).dow] ?? "Cocktail hour";

/** Compact week table for the visit panel: groups identical rows. */
export function weekRows() {
  const byWindow = new Map<string, { days: string[]; dows: number[] }>();
  for (const r of hours) {
    const k = `${h(r.open)} — ${h(r.close)}`;
    const prev = byWindow.get(k);
    byWindow.set(k, {
      days: [...(prev?.days ?? []), r.short],
      dows: [...(prev?.dows ?? []), r.dow],
    });
  }
  return [...byWindow.entries()].map(([window, { days, dows }]) => ({
    window,
    days,
    dows,
  }));
}
