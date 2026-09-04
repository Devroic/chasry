-- Heartbeat per cron execution, so /admin/emails can tell "ran but nothing was due"
-- apart from "didn't run" — reminder_logs rows only exist when something sent/failed/
-- skipped, which on quiet days is nothing.
create table public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  ran_at timestamptz not null default now(),
  sent integer not null default 0,
  failed integer not null default 0,
  skipped integer not null default 0
);

create index cron_runs_job_ran_at_idx on public.cron_runs (job, ran_at desc);

alter table public.cron_runs enable row level security;
-- No policies: written by the cron jobs and read by /admin, both on the service role.
