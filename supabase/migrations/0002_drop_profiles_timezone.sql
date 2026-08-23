-- profiles.timezone was never read or written by the app after the pricing
-- model dropped the trial concept (see PROJECT.md / ARCHITECTURE.md). The
-- reminder cron is UTC-only regardless of this column, so it's safe to drop.
alter table public.profiles drop column if exists timezone;
