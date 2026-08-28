-- Optional single PDF attached to an invoice, included on its reminder
-- emails. Stored directly on the row (not Supabase Storage): one small
-- (<=5MB, enforced in app code) file per invoice, and `invoices` already
-- has correct RLS scoping (user_id = auth.uid()), so this needs zero new
-- RLS policies — Storage would have meant a second, separate RLS surface
-- to get right, for a feature this size.
alter table public.invoices
  add column attachment_filename text,
  add column attachment_content_type text,
  add column attachment_data bytea;
