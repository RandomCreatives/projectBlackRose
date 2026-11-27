-- Black Rose — digital menu book fields (dual pricing + chapter cover imagery)
-- Supports Shot / Bottle (spirits, whisky, cognac) and Full / Half (kitchen) columns,
-- plus per-chapter cover images for the interactive digital menu book.

alter table public.menu_categories
  add column if not exists price_label text not null default '',
  add column if not exists secondary_price_label text not null default '',
  add column if not exists image_url text not null default '';

alter table public.menu_items
  add column if not exists secondary_price_cents integer;

comment on column public.menu_categories.price_label is 'Primary price column header (e.g. Shot, Full, Glass, Bottle).';
comment on column public.menu_categories.secondary_price_label is 'Optional secondary price column header (e.g. Bottle, Half).';
comment on column public.menu_categories.image_url is 'Optional cover photo path or URL for the chapter spread.';
comment on column public.menu_items.secondary_price_cents is 'Optional second price in minor units (e.g. bottle price or half portion).';
