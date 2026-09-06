-- Keep profiles.email in step with a confirmed auth email change. Without this, changing
-- your login email would leave profiles.email (used for reminder reply-to, admin, notices)
-- pointing at the old address. Fires as the auth service, not the authenticated user, so the
-- 0019 email-guard trigger doesn't block it.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_email_change
  after update of email on auth.users
  for each row
  execute function public.sync_profile_email();
