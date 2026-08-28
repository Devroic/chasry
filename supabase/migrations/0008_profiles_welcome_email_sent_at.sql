-- Tracks whether the one-time welcome email has gone out for this account.
-- sendWelcomeEmail() (app/(auth)/actions.ts) claims the send by updating this
-- column with .is("welcome_email_sent_at", null) as the filter, atomically:
-- two near-simultaneous calls (e.g. React Strict Mode double-invoking the
-- effect that triggers it in dev, or someone revisiting /signup/confirmed)
-- can't both pass, only the one that actually wins the row update sends.
alter table public.profiles add column welcome_email_sent_at timestamptz;
