-- Lets a user set a payment link and/or a reminder schedule at the client
-- level (falls back to their account default) and, per invoice, override
-- either again (falls back to the client's, then the account default).
-- reminder_offsets/reminder_enabled are always written together by the app
-- (both null = "inherit", both set = "custom schedule") even though the
-- columns are independently nullable at the DB level.

alter table public.customers
  add column payment_link text,
  add column reminder_offsets integer[],
  add column reminder_enabled boolean;

alter table public.invoices
  add column reminder_offsets integer[],
  add column reminder_enabled boolean;
-- invoices.payment_link already exists (0001_init.sql).
