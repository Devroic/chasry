-- Language reminder emails are sent in, mirroring the payment_link cascade:
-- an account-level default plus an optional per-client override.
alter table public.profiles add column reminder_locale text not null default 'en'
  check (reminder_locale in ('en', 'el'));

alter table public.customers add column reminder_locale text
  check (reminder_locale in ('en', 'el'));
