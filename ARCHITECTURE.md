# Chasry — Architecture (as built)

This is the technical reference for the app: stack, schema, and API surface as they actually
ended up, not just as planned. Where the build diverged from the original plan, that's called
out explicitly — trust this file over memory of the plan.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) — Server Actions for all CRUD, Route
  Handlers only for the two endpoints an external system calls into.
- **Supabase** — Postgres + Auth + Row Level Security.
- **Stripe Billing** — Checkout + Customer Portal + webhooks. Single price, 7-day trial.
- **Resend** + React Email — reminder emails, sent from `reminders@chasry.com`.
- **Vercel** — hosting (Pro plan) + Cron (`vercel.json`, daily at 07:00 UTC).
- **Tailwind CSS v4 + shadcn/ui** on **Radix UI** primitives (`radix-ui` package) — the shadcn
  CLI's current default is Base UI (`@base-ui/react`); this project was deliberately re-initted
  with `-b radix` instead, since Radix is the better-known/documented primitive set to build
  against reliably. Don't `shadcn add` a component without checking `components.json` still says
  `"style": "radix-nova"` — a plain re-init would silently switch it back to Base UI.
- Forms use `useActionState` + native `FormData` + Zod — **not** react-hook-form (removed from
  `package.json` as unused; the simpler pattern was sufficient and keeps the client bundle
  smaller for a Server-Actions-heavy app).
- Sentry and Upstash rate limiting are wired for (`.env.example`, `lib/rate-limit.ts` no-ops
  without env vars set) but **Sentry itself is not actually integrated yet** — no `@sentry/nextjs`
  install or config. Add it before relying on it.

## Database schema (Postgres via `supabase/migrations/0001_init.sql`)

- `profiles` — 1:1 with `auth.users`, auto-created by the `handle_new_user` trigger.
  `subscription_status` **defaults to `'incomplete'`**, not `'trialing'` — a user only becomes
  `trialing` once they complete Stripe Checkout in onboarding (card required upfront). Don't
  reintroduce a DB-side trial clock independent of Stripe; `trial_ends_at` is written by the
  Stripe webhook from `subscription.trial_end`.
- `customers` — the debtor an invoice is owed by. Called "Clients" in the UI to match how users
  think about it; named `customers` in the schema to avoid confusion with Chasry's own
  subscribers (`profiles`).
- `invoices` — `status` is `unpaid | paid | canceled`. "Overdue" is a *derived* display state
  (`invoiceDisplayStatus()` in `components/dashboard/invoice-status-badge.tsx`), not a stored
  status — don't add an `overdue` enum value to the DB.
- `reminder_settings` — one row per user, `offsets int[]` (negative = days before due, positive
  = after), default `{-7,-3,1}`.
- `reminder_logs` — `unique(invoice_id, offset_days)` is the idempotency guard that stops the
  daily cron double-sending if it's ever invoked twice for the same milestone.
- RLS on every table, `using (user_id = auth.uid())`. `invoices`/`reminder_logs` carry `user_id`
  directly (denormalized) so policies don't need joins.
- `types/database.types.ts` is **hand-written**, not generated — keep it in sync with the SQL by
  hand, or regenerate with the Supabase CLI (command in the file's header comment) once a real
  project exists.

## Supabase client pattern (`lib/supabase/`)

- `client.ts` — browser client (anon key).
- `server.ts` — Server Components/Actions, RLS-scoped to the calling user's session.
- `admin.ts` — service-role key, **bypasses RLS**. Only ever imported by the cron route and the
  Stripe webhook handler — both run without a user session. Never import this anywhere a request
  is on behalf of a specific browser user.

## Auth & subscription gating

- `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts` — see
  `npx @next/codemod middleware-to-proxy`, already applied) only does two things: refresh the
  Supabase session cookie, and redirect logged-out users away from non-public paths. It does
  **not** gate on subscription status.
- Subscription gating is per-page, via `requireActiveSubscription()` in `lib/auth.ts`, called
  from pages that need an active/trialing subscription (dashboard, invoices, customers).
  Deliberately **not** global/in-proxy: `/settings/billing` must stay reachable even when the
  subscription has lapsed, and a global gate would redirect-loop on that exact page.
- `requireUser()` (also in `lib/auth.ts`) is the lighter auth-only check used by pages that don't
  need an active subscription (settings pages).

## API surface

**Route Handlers** (only because an external system calls in, not our own UI):
- `POST /api/stripe/webhook` — handles `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`. (`invoice.payment_failed` intentionally not handled
  separately — `customer.subscription.updated` already reflects `past_due`.) Verifies the Stripe
  signature.
- `GET /api/cron/send-reminders` — Vercel Cron only, requires
  `Authorization: Bearer $CRON_SECRET` (Vercel sends this automatically when `CRON_SECRET` is set
  as a project env var — no extra config needed in `vercel.json`).

**Server Actions**, co-located with the pages that use them:
- `app/(dashboard)/customers/actions.ts`, `.../invoices/actions.ts` — CRUD, `markInvoicePaid`,
  `sendPreviewReminder` (emails a sample reminder to the logged-in user, for QA/preview — not
  sent to the real client).
- `app/(dashboard)/settings/{profile,reminders,billing}/actions.ts` — profile updates, reminder
  offset config, `startCheckout`/`openBillingPortal`.
- `app/(onboarding)/onboarding/actions.ts` — saves profile + kicks off Stripe Checkout.
- `lib/billing.ts` — shared `createCheckoutSession()` helper used by both onboarding and the
  billing settings page, so the trial-eligibility logic (only new Stripe customers get
  `trial_period_days`) lives in one place.
- Account deletion (`app/(dashboard)/settings/profile/actions.ts`) also cancels the Stripe
  subscription first — not just a DB delete — so a deleted account can't keep getting charged.

## Reminder engine

`app/api/cron/send-reminders/route.ts`, run daily:

1. Load active/trialing profiles + their `reminder_settings`.
2. For each unpaid invoice, for each configured offset: if `due_date + offset == today` (UTC)
   and no matching `reminder_logs` row exists, send.
3. Render `emails/reminder-before-due.tsx` or `emails/reminder-overdue.tsx` (tone picked by
   `toneForOffset()` in `lib/reminders.ts`) via Resend, `reply-to` set to the business owner's
   email so replies go to them, not Chasry.
4. Log the attempt (`sent`/`failed`) — this is also what the reminder timeline on the invoice
   detail page reads from.

**Known limitation, not fixed**: date comparison is UTC-based, not per-user timezone. A reminder
can land a few hours off from a user's local midnight. Documented, acceptable for v1.

## UI structure

Route groups: `(auth)` — unauthenticated · `(onboarding)` — post-signup, pre-subscription ·
`(dashboard)` — everything behind `requireUser()`, with `DashboardShell`
(`components/dashboard/dashboard-shell.tsx`) providing the sidebar/topbar and a trial-days-left
banner.

Brand tokens live in `app/globals.css` as CSS variables (`--brand-primary`, etc., plus the
standard shadcn semantic tokens mapped onto them) — see `PROJECT.md` for the hex values. Dark
mode tokens are defined but not currently reachable (`ThemeProvider` is pinned to
`defaultTheme="light"`, `enableSystem={false}`) — deliberate scope cut, not a bug.

## Open items (not yet done)

- Security review and a Next.js/React best-practices pass haven't been run — the project isn't a
  git repo yet, which both tools need. Do this before shipping real user data through it.
- Sentry isn't actually integrated despite the env var placeholder.
- No automated tests exist (unit or e2e) — verification so far has been `tsc`, `eslint`,
  `next build`, and manual browser checks against placeholder env vars only, never a real
  Supabase/Stripe/Resend backend.
