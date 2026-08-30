-- Timestamp of Terms/Privacy acceptance at signup. Nullable — existing accounts predate this.
alter table public.profiles add column terms_accepted_at timestamptz;
