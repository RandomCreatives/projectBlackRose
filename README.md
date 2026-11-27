# Black Rose Lounge — website + admin panel

Next.js 15 (App Router) · TypeScript · Supabase · Vercel.

Concept **B** from the design phase, productionised. The static concept in
`/home/user/blackrose_concept_b.html` stays the design reference; this repo is the site.

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3000 (persists menu + bookings in .data/ without Supabase)
npm run build && npm start
npm test           # hours clock + local-store CRUD assertions
```

## Two front doors

| Route | Who | What |
| --- | --- | --- |
| `/` | guests | the lounge: hero, room, interactive digital menu book, the week, inside, reserve |
| `/menu` | guests (QR / table) | standalone full-screen interactive flipbook digital menu |
| `/admin/login` | the owners | password, 12-hour session |
| `/admin/bookings` | the owners | table requests, status, call-back numbers |
| `/admin/menu` | the owners | add / edit / hide / delete chapters, items, Shot/Bottle & Full/Half prices |

The admin is a different room on purpose: daylight-legible, no glass, no animation, no
brand ornament. The site's decorative layers are scoped to a `.site` wrapper in the
`(site)` route group so none of it can leak into a work screen.

## Where things live

| Path | What |
| --- | --- |
| `content/site.ts` | **Everything static the owners change**: address, phones, hours, the week, gallery captions, socials. |
| `content/blackrose-menu.json` | Official 16-chapter, 169-item Black Rose menu (auto-seeds local dev `.data/menu.json` and works with `import-menu.ts`). |
| `components/DigitalMenuBook.tsx` | Interactive editorial flipbook menu (cover, two-page chapter spreads, 3D corner drag/swipe, live search, Shot/Bottle & Full/Half columns). |
| `lib/hours.ts` | `venueStatus()` — open/closed in East Africa Time, past-midnight spill included. |
| `lib/menu.ts` | Menu read + `formatPrice` / `parsePrice` (minor units, no float money). |
| `lib/supabase.ts` | Server-only REST client. Service-role key never reaches the browser. |
| `lib/auth.ts` | Signed-cookie session (HMAC + expiry, constant-time compare). |
| `lib/store.ts` | Reservation read/write path: Supabase, or `.data/reservations.json` in local dev. |
| `lib/local-store.ts` | Atomic JSON persistence in `.data/` for local development (menu + bookings). |
| `app/api/reservations` | Public form endpoint: validate → throttle → persist → `BR-XXXXX`. |
| `app/api/admin/login` | Password → session cookie. JSON or form POST. |
| `app/admin/actions.ts` | All admin mutations, each re-checking the session. |
| `supabase/` | Migration + notes for the reservation and menu tables. |
| `scripts/import-menu.ts` | Bulk-load a menu from JSON (see `menu.example.json`). |

## The menu is data, not markup

The page renders whatever is in `menu_categories` / `menu_items`, in the owners' order.
Hiding an item (`is_available = false`) takes it off the site without deleting it — that is
the button for a serve you have run out of. Prices are stored in **minor units**
(`price_cents`) and formatted at render, so no float maths ever touches money.

A unique index on `(category_id, lower(name))` makes a double-clicked "Add" impossible.
Re-importing the same JSON updates prices rather than duplicating the menu.

```bash
npx tsx scripts/import-menu.ts content/blackrose-menu.json --dry-run   # see what would change
npx tsx scripts/import-menu.ts content/blackrose-menu.json             # add / update
npx tsx scripts/import-menu.ts content/blackrose-menu.json --replace   # wipe and reload
```

When connecting Supabase later, apply both migrations in `supabase/migrations/`
(`0001_reservations.sql` and `0002_digital_menu_columns.sql`), then run the importer above.

## Booking flow

1. Guest submits name, phone, party, night, time, notes, consent.
2. `/api/reservations` re-validates server-side, silently drops honeypot hits, throttles to
   6 per IP per 10 minutes, writes the row, returns a phone-readable reference.
3. `/admin/bookings` shows them newest-first. The default view is only what still needs an
   answer; status moves requested → confirmed → seated (or cancelled / no-show).
4. Failure never dead-ends a guest: the error hands over the phone number.

Personal data: the form promises deletion 30 days after the night; `purge_old_reservations()`
(45 days, callable from the *Purge old* button) keeps that promise true.

## Environment

| Key | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Vercel | canonical URL, OG, JSON-LD, sitemap |
| `SUPABASE_URL` | Vercel | **server only** |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | **server only**, never `NEXT_PUBLIC_` |
| `ADMIN_PASSWORD` | Vercel | the owners' shared password — change before launch |
| `ADMIN_SESSION_SECRET` | Vercel | ≥16 chars, random; rotating it signs everyone out |

In local development without Supabase credentials, both the menu and bookings run against
atomic JSON files in `.data/` (auto-seeded with starter serves on first load). In
production without Supabase, the site falls back to the Black Rose on the menu and **refuses
to accept a booking** rather than silently dropping it.

## Accessibility & SEO

Skip link, visible focus rings, `aria-live` on the reservation result, real `<figure>` captions,
`prefers-reduced-motion` honoured in CSS *and* JS, a print stylesheet, and contrast on ink
checked to AA (the concept's two failing footer greys were lifted). `BarOrPub` JSON-LD with
`openingHoursSpecification` derived from the same `hours` array the page uses. No
`aggregateRating` — the 4.4 is Google's, not first-party. `/admin` is `noindex` and disallowed.

## Still unverified — do not treat as fact

- The **weekly programme** (Tue vinyl / Thu salon / Fri–Sat after eleven) is a proposal from
  review language, not a published schedule. Flagged on the page.
- **WhatsApp** and **Instagram** — no confirmed number or handle, so neither appears.
- Room photography is to be replaced with the owners' own shoot; the mural artwork is the
  venue's own and is used as designed.
- `geo` coordinates are omitted from JSON-LD: the plus code is public, the lat/lng is unverified.
