create table if not exists public.strain_personalizations (
  id uuid primary key default gen_random_uuid(),
  strain_id uuid not null references public.strains(id) on delete cascade,
  friend_id uuid not null references public.friends(id) on delete cascade,
  personal_notes text,
  strain_type_override text check (
    strain_type_override is null or strain_type_override in ('indica', 'sativa', 'hybrid')
  ),
  thc_override numeric(5,2) check (
    thc_override is null or (thc_override >= 0 and thc_override <= 100)
  ),
  cbd_override numeric(5,2) check (
    cbd_override is null or (cbd_override >= 0 and cbd_override <= 100)
  ),
  effects_override text[],
  flavors_override text[],
  updated_at timestamptz not null default timezone('utc', now()),
  unique (strain_id, friend_id)
);

create index if not exists idx_strain_personalizations_strain_id
on public.strain_personalizations(strain_id);

create index if not exists idx_strain_personalizations_friend_id
on public.strain_personalizations(friend_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_strain_personalizations_updated_at
on public.strain_personalizations;

create trigger trg_strain_personalizations_updated_at
before update on public.strain_personalizations
for each row
execute function public.set_updated_at();

alter table public.strain_personalizations enable row level security;

drop policy if exists "public can read personalizations"
on public.strain_personalizations;
create policy "public can read personalizations"
on public.strain_personalizations
for select
to anon, authenticated
using (true);

drop policy if exists "public can insert personalizations"
on public.strain_personalizations;
create policy "public can insert personalizations"
on public.strain_personalizations
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can update personalizations"
on public.strain_personalizations;
create policy "public can update personalizations"
on public.strain_personalizations
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public can delete personalizations"
on public.strain_personalizations;
create policy "public can delete personalizations"
on public.strain_personalizations
for delete
to anon, authenticated
using (true);
