-- Document the customers/"Clients" naming split in the database itself, so it
-- shows up in Supabase Studio and psql \d+ for anyone reading the schema
-- without the repo open. This is the single most confusing thing about the
-- data model: `customers` are the people our *users* invoice, while our own
-- paying subscribers live in `profiles`.
--
-- Also serves as the first migration applied through `supabase db push`
-- rather than by hand. COMMENT ON is idempotent (it replaces), so re-running
-- this file is harmless.
comment on table public.profiles is
  'Chasry''s own subscribers — 1:1 with auth.users. Created by handle_new_user().';

comment on table public.customers is
  'The debtors a user invoices. Called "Clients" in the UI; named customers here to avoid confusion with profiles (Chasry''s own subscribers).';

comment on table public.invoices is
  'Unpaid/paid invoices being chased. status is unpaid|paid|canceled — "overdue" is derived from due_date at display time, never stored.';

comment on table public.reminder_settings is
  'Per-user default reminder schedule. offsets are days relative to due_date (negative = before). Overridable per client and per invoice.';

comment on table public.reminder_logs is
  'Audit trail + idempotency guard for the daily cron. unique(invoice_id, offset_days) stops double-sends; only sent/skipped are terminal, failed is retried.';
