-- Records when a user accepted the Terms of Service and Privacy Policy at
-- signup, so acceptance is a real, timestamped fact, not just a UI checkbox
-- nobody can point back to. Nullable — existing accounts predate this.
alter table public.profiles add column terms_accepted_at timestamptz;
