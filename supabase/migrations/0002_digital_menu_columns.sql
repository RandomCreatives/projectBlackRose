-- Black Rose — digital menu book fields (sub-headings, dual pricing, inline Friday Happy Hour, chapter plates)
-- Supports Shot / Bottle (spirits, whisky, cognac) and Full / Half (food) columns,
-- inline Friday Happy Hour pricing, sub-headings (e.g. Local wine / By the glass / Vodka / Single malt),
-- and per-chapter cover photography for the interactive digital menu book.

alter table public.menu_categories
  add column if not exists price_label text not null default '',
  add column if not exists secondary_price_label text not null default '',
  add column if not exists image_url text not null default '';

alter table public.menu_items
  add column if not exists group_name text not null default '',
  add column if not exists secondary_price_cents integer,
  add column if not exists happy_hour_price_cents integer;

-- Replace the per-category unique index so wines legitimately appearing in both
-- "Local wine" (bottle) and "By the glass" (glass) are distinct rows.
drop index if exists public.menu_items_unique_name_per_category;
create unique index if not exists menu_items_unique_name_in_group
  on public.menu_items (category_id, lower(name), lower(group_name));

comment on column public.menu_categories.price_label is 'Primary price column header (e.g. Shot, Full, Serve, Bottle).';
comment on column public.menu_categories.secondary_price_label is 'Optional secondary price column header (e.g. Bottle, Half).';
comment on column public.menu_categories.image_url is 'Cover plate path or URL for the chapter spread.';
comment on column public.menu_items.group_name is 'Optional sub-heading within a chapter (e.g. Shots, Local wine, By the glass, Vodka, Single malt).';
comment on column public.menu_items.secondary_price_cents is 'Optional second price in minor units (e.g. bottle price or half portion).';
comment on column public.menu_items.happy_hour_price_cents is 'Optional Friday Happy Hour price in minor units (single serve / shot).';
