-- signup() now also passes terms_accepted (boolean) as auth metadata, the
-- same mechanism 0006 already uses for business_name -- read here so
-- acceptance is recorded atomically at signup by a security-definer trigger
-- RLS can't block, instead of a follow-up UPDATE that would silently fail
-- whenever email confirmation is required and there's no session yet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, business_name, subscription_status, terms_accepted_at)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''),
    'none',
    case when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now() else null end
  );
  insert into public.reminder_settings (user_id) values (new.id);
  return new;
end;
$$;
