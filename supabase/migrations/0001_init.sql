-- Chasry initial schema
-- Run in the Supabase SQL editor, or via `supabase db push` if using the CLI.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: one row per Chasry subscriber (1:1 with auth.users)
-- ─────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  business_name text,
  email text not null,
  timezone text not null default 'UTC',
  currency text not null default 'EUR',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  -- 'none': free plan (default — no card, no Stripe subscription yet).
  -- 'active'/'past_due': paying Pro (past_due keeps Pro access during a
  -- payment retry, matching Stripe's own grace period).
  -- 'canceled': was Pro, subscription ended — back to the free plan's limits.
  subscription_status text not null default 'none'
    check (subscription_status in ('none', 'active', 'past_due', 'canceled')),
  current_period_end timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid());
-- No insert/delete policy for authenticated users: profiles are created by the
-- handle_new_user trigger below and deleted via the delete_account RPC (as the
-- table owner), not directly by client-side calls.

-- Auto-create a profile row whenever a new auth user signs up.
-- subscription_status starts as 'none' — everyone lands on the free plan
-- (see lib/plan.ts for the invoice limit) with full access immediately, no
-- card required. Upgrading to Pro happens later, from Settings → Billing or
-- the in-app upgrade prompt once the free limit is reached.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, subscription_status)
  values (new.id, new.email, 'none');
  insert into public.reminder_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- customers: the debtor/contact an invoice is owed by ("Clients" in the UI)
-- ─────────────────────────────────────────────────────────────────────────
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create index customers_user_id_idx on public.customers (user_id);

alter table public.customers enable row level security;

create policy "customers: all own" on public.customers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- invoices
-- ─────────────────────────────────────────────────────────────────────────
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  invoice_number text,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'EUR',
  issued_date date not null default current_date,
  due_date date not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'canceled')),
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoices_user_id_status_idx on public.invoices (user_id, status);
create index invoices_due_date_idx on public.invoices (due_date);
create index invoices_customer_id_idx on public.invoices (customer_id);

alter table public.invoices enable row level security;

create policy "invoices: all own" on public.invoices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- reminder_settings: one row per user, editable reminder schedule
-- ─────────────────────────────────────────────────────────────────────────
create table public.reminder_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- days relative to due_date: negative = before due, positive = after due
  offsets int[] not null default '{-7,-3,1}',
  enabled boolean not null default true
);

alter table public.reminder_settings enable row level security;

create policy "reminder_settings: all own" on public.reminder_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- reminder_logs: audit trail + idempotency guard for the cron sender
-- ─────────────────────────────────────────────────────────────────────────
create table public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  offset_days int not null,
  status text not null check (status in ('sent', 'failed')),
  resend_message_id text,
  error text,
  sent_at timestamptz not null default now(),
  unique (invoice_id, offset_days)
);

create index reminder_logs_invoice_id_idx on public.reminder_logs (invoice_id);

alter table public.reminder_logs enable row level security;

create policy "reminder_logs: select own" on public.reminder_logs
  for select using (user_id = auth.uid());
-- No insert/update/delete policy: rows are written only by the cron job,
-- which uses the service-role key and bypasses RLS.

-- ─────────────────────────────────────────────────────────────────────────
-- delete_account: lets a user permanently remove their own data + auth user
-- ─────────────────────────────────────────────────────────────────────────
create function public.delete_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_account() to authenticated;
