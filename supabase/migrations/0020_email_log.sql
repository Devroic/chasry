-- Quota bookkeeping for sends reminder_logs doesn't cover (welcome, billing,
-- claim/recurring notices, preview batches), so /admin/emails can count every
-- Resend recipient. Rows outlive the account (on delete set null): the quota
-- was consumed regardless.
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  kind text not null,
  recipient_count integer not null default 1 check (recipient_count between 1 and 100),
  sent_at timestamptz not null default now()
);

create index email_log_sent_at_idx on public.email_log (sent_at);

alter table public.email_log enable row level security;

-- User-context actions (welcome, cancel, preview) insert their own rows; the cron,
-- webhook, and signed-link senders use the service role. Reads are admin-only
-- (service role) — no select policy on purpose.
create policy "email_log: insert own" on public.email_log
  for insert with check (user_id = auth.uid());
