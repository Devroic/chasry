-- Seeds reminder_locale from signup metadata, falling back to 'en'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, business_name, subscription_status, terms_accepted_at, reminder_locale)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''),
    'none',
    case when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now() else null end,
    case when new.raw_user_meta_data ->> 'reminder_locale' in ('en', 'el')
      then new.raw_user_meta_data ->> 'reminder_locale'
      else 'en' end
  );
  insert into public.reminder_settings (user_id) values (new.id);
  return new;
end;
$$;
