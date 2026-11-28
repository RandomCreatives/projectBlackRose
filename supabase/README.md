# Supabase — Black Rose

Project: **`blackrose`** · ref **`mhuhuudlbyyedbbkkmmp`** · region `eu-west-1` · org
`pntkotjechbfdwrfgbot`.

The older project in the same org (`BIS Project`, `uoxtbrioyjrmbeeabncw`) is **not** this site.
Do not point this app at it.

## Schema (applied)

- `public.menu_categories` — 6 official chapters with `price_label`, `secondary_price_label`, and `image_url`
- `public.menu_items` — 125 items with `group_name`, `secondary_price_cents`, and `happy_hour_price_cents`
- `public.reservations` — guest table requests (`purge_old_reservations(keep_days)` defaults to 45 days)
- `public.gallery_photos` — curated venue photography for `/gallery` and homepage strip
- `public.social_links` — official venue social profiles
- `public.social_posts` — featured lounge/social highlights
- `storage.buckets` → **`gallery-media`** — public bucket (8 MB max, JPEG/PNG/WebP/GIF) used by `/admin/gallery` direct uploads

RLS is **enabled** on all public tables. `reservations`, `gallery_photos`, `social_links`, and `social_posts` have no public policies (and `anon`/`authenticated` privileges are revoked); the Next.js server reaches the database and storage bucket exclusively through server code holding `SUPABASE_SERVICE_ROLE_KEY`.

## Vercel environment

Server-side only — never prefix these with `NEXT_PUBLIC_`:

```
SUPABASE_URL=https://mhuhuudlbyyedbbkkmmp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key from the project's API settings>
ADMIN_SESSION_SECRET=<32+ random chars>
ADMIN_PASSWORD=<the owners' password>
NEXT_PUBLIC_SITE_URL=https://<your-vercel-or-custom-domain>
```

Rotating `ADMIN_SESSION_SECRET` signs every admin session out immediately.

## Retention

The reservation form tells guests their details are deleted 30 days after the night.
`purge_old_reservations(45)` is wired to the **Purge old** button in `/admin/bookings`.
Put it on a schedule (Supabase Cron / pg_cron) once the project is on a plan that allows it.
