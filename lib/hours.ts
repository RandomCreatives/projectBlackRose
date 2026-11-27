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

/** 5:00pm rather than 5pm — used where the full window is the point (hero, footer). */
const hLong = (mins: number) => {
  const m = ((mins % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = hh < 12 ? "am" : "pm";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")}${suffix}`;
};

export type Status = {
  open: boolean;
  /** "Open now" / "Closed now" / "Opens at 5pm" */
  headline: string;
  /** one line of supporting detail */
  detail: string;
  /** e.g. "5:00pm — 2:00am" for the current venue day */
  window: string;
  closesAt: string | null;
  closesSoon: boolean;
};

function windowFor(dow: number) {
  const row = hours.find((r) => r.dow === dow) ?? hours[0];
  return row;
}

/**
 * Is the venue open right now?
 * A Tuesday 1am visit is still Monday's shift — closing times past midnight spill
 * into the next calendar day, so yesterday's window is checked first.
 */
export function venueStatus(at: Date = new Date()): Status {
  const { dow, minutes } = venueClock(at);
  const today = windowFor(dow);
  const yesterday = windowFor((dow + 6) % 7);

  const inYest = minutes < yesterday.close - 1440;
  const inToday =
    minutes >= today.open && minutes < Math.min(today.close, 1440);
  const open = inYest || inToday;

  const window = `${hLong(today.open)} — ${hLong(today.close)}`;

  if (inYest) {
    const close = h(yesterday.close);
    const left = yesterday.close - 1440 - minutes; // minutes since midnight, shift already past 00:00
    return {
      open: true,
      headline: "Open now",
      detail:
        left <= 90
          ? `Last orders soon — we close at ${close}.`
          : `Open until ${close} — then we open again at ${h(today.open)}.`,
      // still yesterday's shift, so show yesterday's window, not tonight's
      window: `${hLong(yesterday.open)} — ${hLong(yesterday.close)}`,
      closesAt: close,
      closesSoon: left <= 90,
    };
  }

  if (inToday) {
    const left = today.close - minutes;
    return {
      open: true,
      headline: "Open now",
      detail:
        left <= 90
          ? `Last orders soon — we close at ${h(today.close)}.`
          : `Tonight until ${h(today.close)}.`,
      window,
      closesAt: h(today.close),
      closesSoon: left <= 90,
    };
  }

  if (minutes < today.open) {
    return {
      open: false,
      headline: "Closed now",
      detail: `We open today at ${h(today.open)}.`,
      window,
      closesAt: null,
      closesSoon: false,
    };
  }

  // after midnight but today's shift hasn't started, or a gap
  const nextDow = (dow + 1) % 7;
  const next = windowFor(nextDow);
  return {
    open: false,
    headline: "Closed now",
    detail: `We closed at ${h(today.close)}. Back at ${h(next.open)}.`,
    window,
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
  const byWindow = new Map<string, string[]>();
  for (const r of hours) {
    const k = `${h(r.open)} — ${h(r.close)}`;
    byWindow.set(k, [...(byWindow.get(k) ?? []), r.short]);
  }
  return [...byWindow.entries()].map(([window, days]) => ({ window, days }));
}
