# Supabase — Black Rose

Project: **`blackrose`** · ref **`mhuhuudlbyyedbbkkmmp`** · region `eu-west-1` · org
`pntkotjechbfdwrfgbot`.

The two older projects in the same org are **not** this site: `BIS Project`
(`uoxtbrioyjrmbeeabncw`) is the brand-audit database, and `projects4fun2022@gmail.com`
(`ydhybuqpoxuzkqfhxfmg`) is inactive. Do not point this app at either.

## Schema (already applied)

`menu_categories` · `menu_items` · `reservations`, plus:

- `touch_updated_at()` trigger on both menu tables
- `new_reservation_reference()` — collision-proof `BR-XXXXX`
- `purge_old_reservations(keep_days)` — defaults to 45
- unique index `menu_items_unique_name_per_category` on `(category_id, lower(name))`

RLS is **enabled** on all three. Policies allow public *select* of live categories and
available items only; `reservations` has **no** policy at all, so the anon key can neither
read nor write it. The site reaches the database exclusively through server code holding the
service-role key.

## Vercel environment

Server-side only — never prefix these with `NEXT_PUBLIC_`:

```
SUPABASE_URL=https://mhuhuudlbyyedbbkkmmp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key from the project's API settings>
ADMIN_SESSION_SECRET=<32+ random chars>
ADMIN_PASSWORD=<the owners' password>
NEXT_PUBLIC_SITE_URL=https://www.blkrose.online
```

Rotating `ADMIN_SESSION_SECRET` signs every admin session out immediately.

## Retention

The reservation form tells guests their details are deleted 30 days after the night.
`purge_old_reservations(45)` is wired to the **Purge old** button in `/admin/bookings`.
Put it on a schedule (Supabase Cron / pg_cron) once the project is on a plan that allows it.
