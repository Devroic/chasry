# Chasry — Architecture (as built)

This is the technical reference for the app: stack, schema, and API surface as they actually
ended up, not just as planned. Where the build diverged from the original plan, that's called
out explicitly — trust this file over memory of the plan.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) — Server Actions for all CRUD, Route
  Handlers only for the two endpoints an external system calls into.
- **Supabase** — Postgres + Auth + Row Level Security.
- **Stripe Billing** — Checkout + Customer Portal + webhooks. Single Pro price, no trial (see
  Pricing below).
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

## Pricing & plan gating

See `PROJECT.md` for the reasoning. Mechanically:

- `lib/plan.ts` — single source of truth: `FREE_INVOICE_LIMIT` (3), `isPro(status)`
  (`'active' | 'past_due'` → Pro; `'none' | 'canceled'` → Free), `planLabel()`.
- No subscription gate blocks access anywhere — free and Pro accounts both reach the full app.
  The only thing that differs is whether creating/reopening an invoice is allowed once
  `FREE_INVOICE_LIMIT` active (unpaid) invoices already exist.
- The limit is enforced **twice**: once in the UI (`app/(dashboard)/invoices/new/page.tsx` shows
  `UpgradePrompt` instead of the form when at the cap) and once server-side, inside
  `createInvoice`/`reopenInvoice` in `app/(dashboard)/invoices/actions.ts` — the UI check is not
  the real gate, per `server-auth-actions`: Server Actions are callable directly, so every
  mutation re-checks auth/authorization itself rather than trusting a page-level guard.
- Onboarding no longer touches Stripe at all — it just collects `business_name`/`timezone`/
  `currency` and sets `onboarded_at`. Upgrading happens later, from the paywall moment or
  Settings → Billing, via `lib/billing.ts`'s `createCheckoutSession()` (no `trial_period_days` —
  the free plan already serves that purpose).

## Database schema (Postgres via `supabase/migrations/0001_init.sql`)

- `profiles` — 1:1 with `auth.users`, auto-created by the `handle_new_user` trigger.
  `subscription_status` defaults to **`'none'`** (free plan) and is one of
  `'none' | 'active' | 'past_due' | 'canceled'` — there is no `'trialing'`/`'incomplete'` value
  and no `trial_ends_at` column; both were removed when the pricing model changed from
  card-required-trial to a free tier. Don't reintroduce them without also reintroducing the
  trial concept they supported.
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

## Auth & request-scoped caching (`lib/auth.ts`)

- `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts` — see
  `npx @next/codemod middleware-to-proxy`, already applied) only does two things: refresh the
  Supabase session cookie, and redirect logged-out users away from non-public paths.
- `requireUser()` — auth-only check (redirects to `/login`). Use on pages that don't need the
  `profiles` row (customers, invoices list, reminder settings).
- `requireOnboardedUser()` — auth + "has finished onboarding" check, returning `{ supabase, user,
  profile }`. Called by `app/(dashboard)/layout.tsx` itself, so it gates *every* dashboard page,
  not just one — a page that additionally needs `profile` (dashboard, invoices/new, invoice edit,
  billing, profile settings) should call `requireOnboardedUser()` again rather than fetching
  `profiles` separately.
- Both are backed by `React.cache()` internally (`getAuthedUser`/`getProfile` in `lib/auth.ts`):
  the layout and every child page call these once per navigation, but `supabase.auth.getUser()`
  and the `profiles` query each only actually run **once per request**, not once per component
  that needs them. This mattered concretely here — before caching, a single dashboard page load
  was issuing the auth check and a profile fetch twice (once in the layout, once in the page).
  Don't reintroduce ad hoc `supabase.from("profiles").select(...)` calls in dashboard pages;
  extend `getProfile`'s column list in `lib/auth.ts` instead so the cache stays the one source.

## API surface

**Route Handlers** (only because an external system calls in, not our own UI):
- `POST /api/stripe/webhook` — handles `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`. (`invoice.payment_failed` intentionally not handled
  separately — `customer.subscription.updated` already reflects `past_due`.) Verifies the Stripe
  signature. An unrecognized/incomplete Stripe status maps to `'none'` (free), never silently to
  Pro — see `mapStripeStatus()`.
- `GET /api/cron/send-reminders` — Vercel Cron only, requires
  `Authorization: Bearer $CRON_SECRET`, checked with `crypto.timingSafeEqual` (not `===`) to
  avoid leaking the secret via response-timing differences. Vercel sends this header
  automatically when `CRON_SECRET` is set as a project env var — no extra config needed in
  `vercel.json`. Sends reminders for **every** account regardless of plan — free-plan invoices
  get chased too; plan only limits how many active invoices someone can have, never whether
  reminders work on the ones they do have.

**Server Actions**, co-located with the pages that use them:
- `app/(dashboard)/customers/actions.ts`, `.../invoices/actions.ts` — CRUD, `markInvoicePaid`,
  `sendPreviewReminder` (emails a sample reminder to the logged-in user, for QA/preview — not
  sent to the real client). `createInvoice`/`reopenInvoice` enforce the free-plan limit.
- `app/(dashboard)/settings/{profile,reminders,billing}/actions.ts` — profile updates, reminder
  offset config, `startCheckout`/`openBillingPortal` (both import the shared `requireUser` from
  `lib/auth.ts` — don't reintroduce a local copy here, one existed briefly and was removed).
- `app/(onboarding)/onboarding/actions.ts` — saves profile only; no Stripe call.
- `lib/billing.ts` — shared `createCheckoutSession()` helper used by both the paywall prompt and
  the billing settings page.
- Account deletion (`app/(dashboard)/settings/profile/actions.ts`) also cancels the Stripe
  subscription first — not just a DB delete — so a deleted account can't keep getting charged.

Every exported Server Action authenticates itself internally (`requireUser()`/
`requireOnboardedUser()`/an inline `getUser()` check) rather than relying on the page or layout
that happens to render its form — Server Actions are callable directly, so a layout-level guard
alone would not stop a crafted request. Verified file-by-file; keep doing this for new actions.

## Reminder engine

`app/api/cron/send-reminders/route.ts`, run daily:

1. Load **every** profile (not filtered by plan — see above) + their `reminder_settings`.
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

Route groups: `(auth)` — unauthenticated · `(onboarding)` — post-signup, pre-onboarding ·
`(dashboard)` — everything behind `requireOnboardedUser()`, with `DashboardShell`
(`components/dashboard/dashboard-shell.tsx`) providing the sidebar/topbar and a small Free/Pro
badge next to the account name (not a persistent banner — the free-tier "nudge" only shows up
contextually, as `UpgradePrompt` at the actual paywall moment, matching the brand's "quiet, no
awkward conversations" tone rather than nagging on every page).

Brand tokens live in `app/globals.css` as CSS variables (`--brand-primary`, etc., plus the
standard shadcn semantic tokens mapped onto them) — see `PROJECT.md` for the hex values, also
confirmed against `brand/palette/tokens.css`/`colors.md` (the machine-readable source the
designer provided — check there before changing any brand color). Dark mode tokens are defined
but not currently reachable (`ThemeProvider` is pinned to `defaultTheme="light"`,
`enableSystem={false}`) — deliberate scope cut, not a bug. `globals.css` also respects
`prefers-reduced-motion`, and `Button` sets `cursor-pointer` explicitly (Tailwind/shadcn don't do
this by default — it's the CLI's `--pointer` init flag, not applied here since it wasn't passed).

## Verification passes run so far

- `tsc`/`next build`/`eslint`: clean, re-run after every batch of changes.
- Manual browser check of rendered pages (copy, brand assets loading, console errors) against
  placeholder env vars — never against a real Supabase/Stripe/Resend backend.
- A **manual** security pass (not the packaged `/security-review` skill — see below): confirmed
  RLS coverage, admin-client isolation (only the cron route + webhook import it), Stripe webhook
  signature verification, no `dangerouslySetInnerHTML` anywhere, IDOR-safe queries (every
  dashboard query scopes by `user_id`), and the `delete_account` RPC scopes to `auth.uid()`. Fixed
  the cron secret's timing-unsafe comparison as a result.
- A **manual** pass against Vercel's React/Next.js best-practices rules (not run as an automated
  tool, but which vercel-react-best-practices skill supplied): fixed two real request waterfalls
  (`invoices/[id]` and `customers/[id]` were awaiting a query before starting a second one that
  didn't actually depend on the first), added the `React.cache()` dedup described above, and
  removed a duplicated `requireUser()` in `settings/billing/actions.ts`.

## Open items (not yet done)

- The packaged `/security-review` skill couldn't run — it diffs against a GitHub `origin/HEAD`
  remote, which this repo doesn't have (local-only, not pushed anywhere yet). Once it's pushed,
  run the real skill (and consider `/code-review ultra` for a deeper multi-agent pass) rather
  than relying solely on the manual pass above.
- Sentry isn't actually integrated despite the env var placeholder.
- No automated tests exist (unit or e2e).
- `FREE_INVOICE_LIMIT = 3` is a starting guess, not validated against real usage.
