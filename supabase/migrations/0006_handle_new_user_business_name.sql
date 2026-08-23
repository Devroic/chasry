-- Signup collects a business name, but it never reached public.profiles, so
-- onboarding asked for it a second time.
--
-- Why it silently failed: signup() passed the value as auth metadata
-- (options.data.business_name -> auth.users.raw_user_meta_data), but this
-- trigger only copied id/email/subscription_status, leaving profiles.business_name
-- null. The app then tried to patch it with a follow-up UPDATE — which runs on
-- the RLS-scoped client with *no session yet* whenever email confirmation is
-- required (the default), so RLS rejected it and the write was quietly lost.
-- Evidence it was never landing: a live account had raw_user_meta_data
-- business_name 'Andreas' while profiles.business_name was 'Andreas Era' — the
-- profile value came from re-typing it during onboarding, not from signup.
--
-- Reading the metadata here fixes it at the source: the profile row is created
-- with the name atomically, by a security-definer trigger that RLS can't block,
-- regardless of whether a session exists yet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, business_name, subscription_status)
  values (
    new.id,
    new.email,
    -- nullif so an empty string still counts as "not set" and onboarding asks.
    nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''),
    'none'
  );
  insert into public.reminder_settings (user_id) values (new.id);
  return new;
end;
$$;

-- Backfill anyone who signed up before this fix and hasn't set a name yet.
update public.profiles p
set business_name = nullif(trim(u.raw_user_meta_data ->> 'business_name'), '')
from auth.users u
where u.id = p.id
  and p.business_name is null
  and nullif(trim(u.raw_user_meta_data ->> 'business_name'), '') is not null;
