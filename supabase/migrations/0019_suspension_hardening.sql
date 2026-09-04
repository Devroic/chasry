-- Hardening for account suspension (0018), closing two REST-level bypasses:
--
-- 1. profiles.email now feeds admin decisions (the "can't suspend an admin" guard and
--    the admin metrics/list filters). The "profiles: update own" policy has no column
--    list, so a user could spoof an admin address into their own row. Extend the 0018
--    trigger to make email admin-only too; nothing in the app lets users edit it anyway.
create or replace function public.protect_profiles_suspended_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    if new.suspended_at is distinct from old.suspended_at then
      raise exception 'suspended_at can only be changed by an administrator';
    end if;
    if new.email is distinct from old.email then
      raise exception 'email can only be changed by an administrator';
    end if;
  end if;
  return new;
end;
$$;

-- 2. A suspended user could call the delete_account RPC directly (their JWT stays
--    valid) and re-sign up with the same email as a fresh, unsuspended account.
create or replace function public.delete_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where id = auth.uid() and suspended_at is not null) then
    raise exception 'account is suspended';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
