-- Add personal score (1-10) per friend per strain
alter table public.strain_ratings
  add column if not exists score smallint
  check (score is null or (score >= 1 and score <= 10));
