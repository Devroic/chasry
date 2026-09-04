-- Admin suspension: blocks sign-in to the app and pauses all outgoing email for the
-- account while preserving its data. Set/cleared only from /admin (service role).
alter table public.profiles add column suspended_at timestamptz;

comment on column public.profiles.suspended_at is
  'When set, the account is suspended: the app redirects them to /suspended and the cron jobs skip them. Admin-only; a trigger blocks end users from changing it.';

-- The "profiles: update own" policy has no column list, so without this trigger a
-- suspended user could clear the flag themselves through the REST API.
create or replace function public.protect_profiles_suspended_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and new.suspended_at is distinct from old.suspended_at then
    raise exception 'suspended_at can only be changed by an administrator';
  end if;
  return new;
end;
$$;

create trigger protect_profiles_suspended_at
  before update on public.profiles
  for each row
  execute function public.protect_profiles_suspended_at();
