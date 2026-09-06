-- Tracks whether the user has looked at their reminder schedule, so the dashboard
-- "Get set up" checklist can mark that step done instead of showing it forever.
alter table public.profiles
  add column reminder_schedule_reviewed boolean not null default false;

-- Existing accounts are already past setup; anyone with a client or invoice has
-- moved on, so don't resurface the checklist for them.
update public.profiles p
  set reminder_schedule_reviewed = true
  where exists (select 1 from public.customers c where c.user_id = p.id)
     or exists (select 1 from public.invoices i where i.user_id = p.id);
