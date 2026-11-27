-- Black Rose — reservation requests
-- Run once against the Black Rose Supabase project (NOT the BIS or projects4fun projects).
-- The site writes with the service-role key from a Next.js route handler, so RLS stays
-- closed to the public: anon can read nothing and write nothing.

create extension if not exists "pgcrypto";

create table if not exists public.reservations (
  reference   text primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 2 and 80),
  phone       text not null check (char_length(phone) between 7 and 32),
  guests      text not null,
  night       text not null,
  "time"      text not null,
  notes       text not null default '',
  status      text not null default 'requested'
                check (status in ('requested','confirmed','seated','no_show','cancelled')),
  source      text not null default 'web',
  handled_by  text,
  handled_at  timestamptz
);

create index if not exists reservations_created_at_idx on public.reservations (created_at desc);
create index if not exists reservations_status_idx     on public.reservations (status, created_at desc);

alter table public.reservations enable row level security;
-- no policies: only the service role (server side) may read or write.

-- Retention: the form promises the record is deleted 30 days after the night.
-- Schedule this with pg_cron where available:
--   select cron.schedule('purge-reservations','0 4 * * *', $$select public.purge_old_reservations(45)$$);
create or replace function public.purge_old_reservations(keep_days int default 45)
returns integer language plpgsql security definer as $$
declare removed integer;
begin
  delete from public.reservations where created_at < now() - (keep_days || ' days')::interval;
  get diagnostics removed = row_count;
  return removed;
end $$;

comment on table public.reservations is 'Table requests from the website. Personal data — purge on a schedule.';
