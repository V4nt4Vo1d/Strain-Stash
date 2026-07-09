-- Run this in Supabase SQL Editor.
-- This schema matches the fields used by the app.

create extension if not exists pgcrypto;

create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null check (
    color in ('emerald', 'amber', 'sky', 'rose', 'violet', 'orange', 'teal', 'lime')
  ),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.strains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  strain_type text not null check (strain_type in ('indica', 'sativa', 'hybrid')),
  thc numeric(5,2) check (thc is null or (thc >= 0 and thc <= 100)),
  cbd numeric(5,2) check (cbd is null or (cbd >= 0 and cbd <= 100)),
  effects text[] not null default '{}',
  flavors text[] not null default '{}',
  notes text,
  source_url text,
  source_type text not null default 'other' check (source_type in ('leafly', 'levels', 'other')),
  image_url text,
  added_by uuid references public.friends(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.strain_ratings (
  id uuid primary key default gen_random_uuid(),
  strain_id uuid not null references public.strains(id) on delete cascade,
  friend_id uuid not null references public.friends(id) on delete cascade,
  status text check (status is null or status in ('liked', 'disliked', 'want_to_try')),
  favorite boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (strain_id, friend_id)
);

create index if not exists idx_friends_created_at on public.friends(created_at);
create index if not exists idx_strains_created_at on public.strains(created_at desc);
create index if not exists idx_strain_ratings_strain_id on public.strain_ratings(strain_id);
create index if not exists idx_strain_ratings_friend_id on public.strain_ratings(friend_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_strain_ratings_updated_at on public.strain_ratings;
create trigger trg_strain_ratings_updated_at
before update on public.strain_ratings
for each row
execute function public.set_updated_at();

alter table public.friends enable row level security;
alter table public.strains enable row level security;
alter table public.strain_ratings enable row level security;

drop policy if exists "public can read friends" on public.friends;
create policy "public can read friends"
on public.friends
for select
to anon, authenticated
using (true);

drop policy if exists "public can insert friends" on public.friends;
create policy "public can insert friends"
on public.friends
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can delete friends" on public.friends;
create policy "public can delete friends"
on public.friends
for delete
to anon, authenticated
using (true);

drop policy if exists "public can read strains" on public.strains;
create policy "public can read strains"
on public.strains
for select
to anon, authenticated
using (true);

drop policy if exists "public can insert strains" on public.strains;
create policy "public can insert strains"
on public.strains
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can delete strains" on public.strains;
create policy "public can delete strains"
on public.strains
for delete
to anon, authenticated
using (true);

drop policy if exists "public can read ratings" on public.strain_ratings;
create policy "public can read ratings"
on public.strain_ratings
for select
to anon, authenticated
using (true);

drop policy if exists "public can upsert ratings" on public.strain_ratings;
create policy "public can upsert ratings"
on public.strain_ratings
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can update ratings" on public.strain_ratings;
create policy "public can update ratings"
on public.strain_ratings
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public can delete ratings" on public.strain_ratings;
create policy "public can delete ratings"
on public.strain_ratings
for delete
to anon, authenticated
using (true);
