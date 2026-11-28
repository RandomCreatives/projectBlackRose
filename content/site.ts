/**
 * Single source of truth for the Black Rose site.
 * Everything the owners are likely to change lives here, not in the markup.
 *
 * VERIFIED = confirmed from a public source or official venue signage (IMG_0249 / IMG_0248).
 * UNVERIFIED = illustrative placement copy. Must be replaced or confirmed before go-live.
 */

export const venue = {
  name: "Black Rose Lounge",
  tagline: "An after-dark salon on Djibouti Street",
  since: 2003,
  positioning:
    "An after-dark salon on Djibouti Street, since 2003: candlelight, a properly made cocktail, and a conversation you can actually hear.",
  address: {
    line1: "Yegemiya Plaza, 2nd floor, Suite 201",
    line2: "Djibouti Street",
    city: "Addis Ababa",
    country: "Ethiopia",
    plusCode: "XQVM+RW7",
    landmark: "Near Saro Maria Hotel",
    full: "Yegemiya Plaza, 2nd floor, Suite 201, Djibouti Street, Addis Ababa, Ethiopia",
  },
  phones: [
    { label: "+251 11 663 9884", tel: "+251116639884", kind: "landline" },
    { label: "+251 91 151 3984", tel: "+251911513984", kind: "mobile" },
  ],
  whatsapp: null as string | null, // UNVERIFIED — do not invent a number
  email: "blackrosehiwet@gmail.com",
  socials: [
    { label: "Facebook", href: "https://www.facebook.com/Blackroseaddis1/" },
    {
      label: "Tripadvisor",
      href: "https://www.tripadvisor.com/Restaurant_Review-g293791-d5408589-Reviews-Black_Rose_Lounge-Addis_Ababa.html",
    },
  ],
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Black+Rose+Lounge+Yegemiya+Plaza+Djibouti+Street+Addis+Ababa",
  directionsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=Black+Rose+Lounge+Yegemiya+Plaza+Djibouti+Street+Addis+Ababa",
  dress: {
    short: "Smart casual after 9pm",
    long: "No sportswear or training shoes after 9pm. Said here so nobody learns it at the door.",
  },
  ratings: { google: { score: 4.4, count: 133 }, hotspot: { score: 4.5, count: 126 } },
} as const;

/** Opening times in minutes from midnight, local (Africa/Addis_Ababa, UTC+3, no DST). Doors at 5pm, every day. Verified on venue door sign. */
export const hours = [
  { dow: 0, open: 17 * 60, close: 24 * 60 + 30, label: "Sunday", short: "Sun" },
  { dow: 1, open: 17 * 60, close: 24 * 60 + 30, label: "Monday", short: "Mon" },
  { dow: 2, open: 17 * 60, close: 26 * 60, label: "Tuesday", short: "Tue" },
  { dow: 3, open: 17 * 60, close: 26 * 60, label: "Wednesday", short: "Wed" },
  { dow: 4, open: 17 * 60, close: 26 * 60, label: "Thursday", short: "Thu" },
  { dow: 5, open: 17 * 60, close: 26 * 60, label: "Friday", short: "Fri" },
  { dow: 6, open: 17 * 60, close: 26 * 60, label: "Saturday", short: "Sat" },
] as const;

const hhmm = (mins: number) => {
  const m = ((mins % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

/** schema.org openingHoursSpecification, derived from `hours` so the two can never drift. */
export const openingHoursSpec = hours.map((h) => {
  const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][h.dow];
  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: `https://schema.org/${day}`,
    opens: hhmm(h.open),
    closes: hhmm(h.close),
  };
});

/** The week — regular rhythm + special evenings & events live together here (no separate Events tab). */
export type Night = { key: string; day: string; title: string; body: string; meta: string; badge: string };

export const week: Night[] = [
  {
    key: "tue",
    day: "Tuesday",
    title: "Vinyl & conversation",
    body: "No DJ. Records from the collection, low volume, the quietest night we run.",
    meta: "6pm — midnight",
    badge: "No cover",
  },
  {
    key: "thu",
    day: "Thursday",
    title: "The salon",
    body: "One long table, eight seats, hosted. Four cocktails and no obligation to leave.",
    meta: "7pm",
    badge: "8 seats",
  },
  {
    key: "fri-hh",
    day: "Every Friday · Verified",
    title: "Friday Happy Hour",
    body: "Selected cocktails, house spirits, and cold beers poured at special Friday prices before the room builds for the weekend.",
    meta: "5:00pm — 7:30pm",
    badge: "Selected drinks",
  },
  {
    key: "fri-sat",
    day: "Friday & Saturday",
    title: "After eleven",
    body: "Seated before 9, loud after 11. DJ from 10pm. Cover applies on event nights — published here, always.",
    meta: "DJ from 10pm",
    badge: "Cover from 10",
  },
];

/** Special evenings & hosted gatherings folded directly into The Week. */
export type SpecialEvent = {
  key: string;
  when: string;
  title: string;
  body: string;
  meta: string;
  ctaLabel: string;
  ctaHref: string;
};

export const specialNights: SpecialEvent[] = [
  {
    key: "friday-hh-card",
    when: "Weekly · Fridays",
    title: "Golden Hour in Suite 201",
    body: "44 pours on the Friday Happy Hour chapter — from the Black Rose signature to classic sours, draft-cold beers, and house wines.",
    meta: "5:00pm — 7:30pm · Open seating",
    ctaLabel: "See Happy Hour menu",
    ctaHref: "/menu",
  },
  {
    key: "salon-private",
    when: "By reservation · Any night",
    title: "The corner banquette & private tables",
    body: "Celebrating a birthday, an anniversary, or hosting visiting friends in Addis? Reserve the terracotta banquette for up to eight.",
    meta: "Held until 9:00pm",
    ctaLabel: "Reserve the corner",
    ctaHref: "/visit",
  },
  {
    key: "guest-sets",
    when: "Selected weekends",
    title: "Late sets & live acoustic sessions",
    body: "Occasional guest selectors, soul & Ethio-jazz sets, and intimate acoustic evenings announced first on our socials and listed here.",
    meta: "From 10:00pm · Follow socials",
    ctaLabel: "See our socials",
    ctaHref: "/gallery",
  },
];

/** Menu highlights — fallback if DB/local store cannot be read. */
export type Pour = { kicker: string; name: string; body: string; note: string; price: string; placeholder: boolean };

export const menu: Pour[] = [
  {
    kicker: "The house serve",
    name: "Black Rose",
    body: "Ordered by name, made the same way every night for twenty years. Dark, floral, dry.",
    note: "Signature",
    price: "ETB 445",
    placeholder: true,
  },
  {
    kicker: "Stirred",
    name: "Noir Sour",
    body: "Bourbon, citrus, and a float of red wine. The one guests order twice.",
    note: "House favourite",
    price: "ETB 480",
    placeholder: true,
  },
  {
    kicker: "Shaken",
    name: "Velvet Hour",
    body: "Gin, blackberry, lemon, egg white. Soft, cold, built for the second hour.",
    note: "New",
    price: "ETB 470",
    placeholder: true,
  },
];

export const gallery = [
  { src: "/img/room.jpg", alt: "Candlelit table with fringed mosaic lamp and red rose at Black Rose Lounge", cap: "The room, after dark", tag: "Candlelight", span: "wide" },
  { src: "/img/gallery/banquette-corner.jpg", alt: "Terracotta corner banquette with ornate gold mirror, mosaic sconces, and candle", cap: "The corner banquette", tag: "Reserve", span: "wide" },
  { src: "/img/gallery/velvet-tables.jpg", alt: "Crimson and plum velvet chairs around tiled tables with candles and red roses", cap: "Velvet & terracotta", tag: "Main room", span: "wide" },
  { src: "/img/gallery/table-for-two.jpg", alt: "Table set with candle, red rose, and printed Black Rose menu", cap: "A table for two", tag: "Velvet seating", span: "tall" },
  { src: "/img/gallery/mosaic-geez.jpg", alt: "Brass Turkish mosaic wall sconce above hand-tiled Ethiopian Ge'ez script cross", cap: "Mosaic & Ge'ez tilework", tag: "The details", span: "tall" },
  { src: "/img/gallery/main-lounge.jpg", alt: "Wide view across Black Rose Lounge in Suite 201", cap: "Across the salon", tag: "Suite 201", span: "wide" },
] as const;

export const nav = [
  { href: "/", label: "The Room" },
  { href: "/menu", label: "Menu" },
  { href: "/week", label: "The Week" },
  { href: "/gallery", label: "Gallery" },
  { href: "/visit", label: "Find Us" },
] as const;

/** Guests / nights / times offered by the reservation form. Keep in sync with lib/hours.ts. */
export const guestOptions = ["1 guest", "2 guests", "3 guests", "4 guests", "5 guests", "6 guests", "8 — the salon"] as const;
export const nightOptions = [
  { value: "tue", label: "Tuesday — vinyl", dow: 2 },
  { value: "wed", label: "Wednesday", dow: 3 },
  { value: "thu", label: "Thursday — the salon", dow: 4 },
  { value: "fri", label: "Friday", dow: 5 },
  { value: "sat", label: "Saturday", dow: 6 },
  { value: "sun", label: "Sunday", dow: 0 },
  { value: "mon", label: "Monday", dow: 1 },
] as const;
export const timeOptions = ["Around 6:00pm", "Around 7:30pm", "Around 9:00pm", "After 11:00pm"] as const;
