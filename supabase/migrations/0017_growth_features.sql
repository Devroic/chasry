-- Growth features: BCC-me, snooze, recurring invoices, weekly digest, and
-- the client-side "I've paid" claim.

-- "Send me a copy of every reminder" toggle (Settings → Reminders).
alter table public.reminder_settings
  add column copy_self boolean not null default false;

alter table public.invoices
  -- Pause all reminders for this invoice until this date (exclusive). Steps
  -- whose target day passes while paused are marked 'skipped' by the cron
  -- after the pause ends, consistent with the "never send late" rule.
  add column snoozed_until date,
  -- 'monthly': the daily cron creates the next occurrence 14 days before its
  -- due date (see rollRecurringInvoices in app/api/cron/send-reminders).
  add column recurring text not null default 'none'
    check (recurring in ('none', 'monthly')),
  -- Set once the successor invoice has been created — the idempotency marker
  -- that makes only the newest invoice in a chain eligible to roll.
  add column recurred_at timestamptz,
  -- The client clicked "I've paid" in a reminder email. Reminders pause until
  -- the owner either marks the invoice paid or dismisses the claim.
  add column paid_claimed_at timestamptz;

-- Only the newest link of each recurring chain is scanned by the cron.
create index invoices_recurring_pending_idx on public.invoices (user_id)
  where recurring <> 'none' and recurred_at is null;

alter table public.profiles
  -- Weekly summary email (Monday). Opt-out, not opt-in — it only sends when
  -- there is something to say (unpaid invoices or recent reminder activity).
  add column digest_enabled boolean not null default true,
  -- Idempotency guard so a retried cron run can't double-send the digest.
  add column digest_sent_at timestamptz;
