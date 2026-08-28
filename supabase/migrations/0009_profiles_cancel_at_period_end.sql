-- Whether an active subscription is scheduled to end at its current period
-- boundary instead of renewing (set via the Stripe customer portal's cancel
-- flow). subscription_status stays "active" until Stripe actually deletes
-- the subscription at that date, so this is the only way to tell "will
-- renew" and "will end" apart in the meantime.
alter table public.profiles add column cancel_at_period_end boolean not null default false;
