-- Lets a user record a reminder_logs row for their own invoice — needed by
-- sendReminderNow() (app/(dashboard)/invoices/actions.ts), the "Send now"
-- button for a reminder due today that hasn't been picked up yet (the cron
-- only gets one chance per offset, its own target day, no later catch-up).
-- Everything else still only reads this table; the cron remains the only
-- writer for every other status transition (still via the service-role key).
--
-- Checks both that the row's own user_id is the caller AND that the
-- invoice it references actually belongs to them — the first alone isn't
-- enough, a caller could set their own user_id while pointing invoice_id
-- at someone else's invoice, planting a fake log that suppresses a
-- reminder the cron would otherwise still send for that other user.
create policy "reminder_logs: insert own" on public.reminder_logs
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.invoices
      where invoices.id = reminder_logs.invoice_id
      and invoices.user_id = auth.uid()
    )
  );
