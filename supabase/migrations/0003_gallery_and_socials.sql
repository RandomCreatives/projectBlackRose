-- Black Rose Lounge — Gallery Photos & Socials Showcase
-- Run after 0002_digital_menu_columns.sql when deploying to Supabase.

create table if not exists public.gallery_photos (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(title) between 1 and 120),
  tag         text not null default '' check (length(tag) <= 48),
  alt         text not null default '' check (length(alt) <= 240),
  image_url   text not null check (length(image_url) between 1 and 500),
  span        text not null default 'wide' check (span in ('wide', 'tall', 'square')),
  sort_order  int not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.social_links (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null default 'other' check (platform in ('instagram', 'facebook', 'tiktok', 'tripadvisor', 'whatsapp', 'other')),
  label       text not null check (length(label) between 1 and 60),
  handle      text not null default '' check (length(handle) <= 80),
  url         text not null check (length(url) between 1 and 500),
  sort_order  int not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.social_posts (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null default 'instagram' check (platform in ('instagram', 'facebook', 'tiktok', 'tripadvisor', 'other')),
  caption       text not null check (length(caption) between 1 and 400),
  image_url     text not null check (length(image_url) between 1 and 500),
  post_url      text not null default '' check (length(post_url) <= 500),
  posted_label  text not null default '' check (length(posted_label) <= 60),
  sort_order    int not null default 0,
  is_visible    boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists gallery_photos_order_idx on public.gallery_photos (sort_order, created_at);
create index if not exists social_links_order_idx   on public.social_links (sort_order, created_at);
create index if not exists social_posts_order_idx   on public.social_posts (sort_order, created_at);

alter table public.gallery_photos enable row level security;
alter table public.social_links   enable row level security;
alter table public.social_posts   enable row level security;

revoke all on public.gallery_photos from anon, authenticated;
revoke all on public.social_links   from anon, authenticated;
revoke all on public.social_posts   from anon, authenticated;
