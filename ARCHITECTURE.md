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
- Forms use `useActionState` (the Server Action round-trip: pending state, top-level server
  errors) **combined with** `react-hook-form` + `zodResolver` (client-side, real-time field
  validation) — see "Forms & validation" below. react-hook-form was briefly removed as unused
  early on, then reinstated once real inline validation became a requirement; don't remove it
  again without replacing the validation pattern everywhere it's used.
- **Critical gotcha, already caused real bugs**: this installed version of `radix-ui`'s `Select`
  and `Switch` render *no* hidden native form control at all — no bubble `<input>`/`<select>` to
  sync into a native `<form>`'s `FormData`, unlike some other Radix versions/setups. A `<Select
  name="x">` or `<Switch name="x">` used inside a plain `<form action={serverAction}>` (the
  "dashboard CRUD forms" pattern below, not the react-hook-form one) silently submits **nothing**
  for that field — `formData.get("x")` is always `null`. This broke reminder-schedule saving
  (always wrote `enabled: false, offsets: []` no matter what was toggled), profile currency
  saving (any profile save failed validation, not just currency), and invoice creation/editing
  entirely (`customer_id` was always missing → "Choose a client" error on every single invoice
  save) before being caught and fixed. **The fix, and the required pattern for any new plain-
  FormData form using `Select`/`Switch`**: make the component controlled (`value`/`checked` +
  `onValueChange`/`onCheckedChange` into local `useState`) and render your own
  `<input type="hidden" name="x" value={...}>` next to it — see `invoice-form.tsx`,
  `profile-form.tsx`, and `reminder-settings-form.tsx` for the pattern. Forms already on the
  react-hook-form pattern (`onboarding-form.tsx`'s currency `Select` via `Controller`) are
  unaffected, since react-hook-form reads its own state, never the native `FormData`.
- Sentry and Upstash rate limiting are wired for (`.env.example`, `lib/rate-limit.ts` no-ops
  without env vars set) but **Sentry itself is not actually integrated yet** — no `@sentry/nextjs`
  install or config. Add it before relying on it.
- **`npm run lint` deliberately does *not* pass `--quiet`.** It used to, which hid all warnings
  and showed only errors — that's how the `ThemeToggle` hydration bug (see "Theme" below) stayed
  invisible longer than it should have. Expect **2 standing warnings**, both
  `react-hooks/incompatible-library` on `watch()` in `invoice-form.tsx` and
  `reminder-settings-form.tsx`: React Compiler can't memoize react-hook-form's `watch()`. These
  are **advisory only and currently inert** — React Compiler is not enabled by default in Next.js
  16 and isn't enabled here (no `reactCompiler` in `next.config.ts`, no
  `babel-plugin-react-compiler` installed), so nothing is actually being skipped. They'd become
  real if React Compiler is ever turned on; switching those `watch()` calls to `useWatch()` is
  the likely fix at that point. Don't "fix" them by re-adding `--quiet`.
- `shadcn` and `react-email` are **devDependencies**, not runtime dependencies — both are
  CLI-only (`npx shadcn add …`, and the `email:dev` preview server) and are never imported by app
  code, so shipping them in a production install was pure bloat. The *runtime* email library,
  `@react-email/components`, **is** imported (`emails/`) and correctly stays in `dependencies`.
  Don't move that one.

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
  subscribers (`profiles`). `supabase/migrations/0003_customers_unique_email.sql` adds a
  `unique (user_id, email)` constraint (a user could otherwise create two client records with
  the same email by mistake — a real reported bug), with app-side friendly-error handling
  (`isDuplicateEmailError()` in `customers/actions.ts`, checks Postgres code `23505`). **Applied**
  — the pre-existing duplicate rows blocking it were resolved (the table was empty by the time
  this ran) and the constraint is now live in the DB, not just enforced in the UI.
  `supabase/migrations/0004_customer_invoice_overrides.sql` adds the per-client/per-invoice
  override columns described in "Reminder engine" below (`payment_link`, `reminder_offsets`,
  `reminder_enabled` on `customers`; `reminder_offsets`, `reminder_enabled` on `invoices` —
  `invoices.payment_link` already existed) — also applied.
- `invoices` — `status` is `unpaid | paid | canceled`. "Overdue" is a *derived* display state
  (`invoiceDisplayStatus()` in `components/dashboard/invoice-status-badge.tsx`), not a stored
  status — don't add an `overdue` enum value to the DB.
- `invoices.issued_date` is gone — removed from `invoiceSchema`, the invoice form, and every
  select list first (it was never read by the reminder engine, which is driven entirely by
  `due_date`, and wasn't surfaced in any list/sort/filter — just a rarely-touched field
  defaulting to today), then dropped via `supabase/migrations/0005_drop_invoices_issued_date.sql`,
  same pattern as `profiles.timezone` (`0002_drop_profiles_timezone.sql`). **That migration is
  written but not yet applied** — the Supabase dashboard SQL editor wasn't reachable through
  browser automation when this was done (blank page after repeated navigation attempts, likely a
  session issue, not a code problem); run it manually before assuming the column is actually
  gone from the live DB. The app code no longer reads or writes it either way, so this is safe to
  leave pending.
- `reminder_settings` — one row per user, `offsets int[]` (negative = days before due, positive
  = after), default `{-7,-3,1}`.
- `reminder_logs` — `unique(invoice_id, offset_days)` is the idempotency guard that stops the
  daily cron double-sending if it's ever invoked twice for the same milestone.
- RLS on every table, `using (user_id = auth.uid())`. `invoices`/`reminder_logs` carry `user_id`
  directly (denormalized) so policies don't need joins.
- `types/database.types.ts` is **hand-written**, not generated — keep it in sync with the SQL by
  hand, or regenerate with the Supabase CLI (command in the file's header comment) once a real
  project exists.
- `profiles.timezone` is gone — removed from `profileSchema`, the onboarding/profile forms, and
  `getProfile`'s select list first (nothing read or wrote it), then dropped from the database
  itself via `supabase/migrations/0002_drop_profiles_timezone.sql` once confirmed unused. Don't
  re-add a timezone field to a form without also deciding what should actually read it (the
  reminder cron is UTC-only regardless — see "Known limitation" below) and adding a migration to
  bring the column back.

## Supabase client pattern (`lib/supabase/`)

- `client.ts` — browser client (anon key).
- `server.ts` — Server Components/Actions, RLS-scoped to the calling user's session.
- `admin.ts` — service-role key, **bypasses RLS**. Only ever imported by the cron route and the
  Stripe webhook handler — both run without a user session. Never import this anywhere a request
  is on behalf of a specific browser user.

## Auth & request-scoped caching (`lib/auth.ts`)

- `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts` — see
  `npx @next/codemod middleware-to-proxy`, already applied) refreshes the Supabase session cookie
  and redirects. Logic lives in `lib/supabase/middleware.ts`, keyed on an explicit
  `PROTECTED_PREFIXES` allowlist (`/dashboard`, `/invoices`, `/customers`, `/settings`,
  `/onboarding`), **not** "everything except a few public paths." That distinction matters: a
  blocklist approach means a mistyped/nonexistent URL for a logged-out visitor gets redirected to
  `/login` before Next.js ever gets to render `not-found.tsx` — this was a real bug, caught by
  actually testing a bad URL while logged out. Any *new* protected route needs adding to
  `PROTECTED_PREFIXES`, or it's reachable while logged out (though every page still checks auth
  itself server-side regardless — see below). `login()` reads a `next` param (validated by
  `safeNextPath()` — same-origin relative paths only, no open redirect) and returns the user to
  where they were headed instead of always `/dashboard`.
- The middleware also bounces an already-logged-in visitor away from `PUBLIC_AUTH_PATHS`
  (`/login`, `/signup`, `/reset-password`) straight to `/dashboard` — except for
  `SESSION_ACTION_PATHS` (`/reset-password/confirm`, `/signup/confirmed`), which are explicitly
  excluded from that bounce. Those two pages exist specifically to consume a one-time link from an
  email and show its result (new password saved / email confirmed), and Supabase signs the visitor
  in as a side effect of visiting them — without the exclusion, the "already logged in" redirect
  would fire and send them to `/dashboard` before they ever saw the confirmation message. Any new
  page that follows this same pattern (an emailed link that establishes a session on arrival)
  needs adding to `SESSION_ACTION_PATHS` too.
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
- `app/(auth)/actions.ts`'s `signup()` passes `emailRedirectTo: ${appUrl}/signup/confirmed`, and
  that page (`app/(auth)/signup/confirmed/page.tsx`, client component) shows a definitive
  confirmed/expired result by checking `supabase.auth.getSession()` on mount — Supabase's
  confirmation-link redirect carries the new session in the URL hash, which the browser client
  auto-consumes before this check runs (same mechanism `reset-password/confirm` already relied on
  implicitly). **Gotcha, already hit once**: `signUp()` does *not* return an error for an email
  that's already registered and confirmed — Supabase's anti-enumeration default returns a normal
  success-shaped response instead, signaling the duplicate only via `data.user.identities` being
  an empty array. `signup()` checks that explicitly and returns the same "account already exists"
  error as the other branch; don't rely on `error` alone to catch this case. When `signUp()` *does*
  return an error, branch on `error.code` (typed as `ErrorCode` in `@supabase/auth-js`,
  e.g. `'user_already_exists' | 'over_email_send_rate_limit' | 'weak_password' | ...`), not on
  `error.message` substrings — message text isn't a stable API contract, `.code` is.
  **Supabase Auth's own emails now go through custom SMTP (Resend), not the shared default
  mailer** — this was hit as a real bug (`over_email_send_rate_limit`, from the default mailer's
  ~2/hour testing-only cap) and fixed properly rather than worked around: `chasry.com` is verified
  as a sending domain in Resend (DKIM/SPF/DMARC records added at Namecheap — `resend._domainkey`
  TXT, `rsend`/`send` CNAMEs, `_dmarc` TXT; none of these touch the existing `@`/`www` records or
  the `info@chasry.com` forwarding), and Authentication → Emails → SMTP Settings in Supabase points
  at `smtp.resend.com:465` with that same `RESEND_API_KEY`, sending as `Chasry <noreply@chasry.com>`.
  The Auth → Rate Limits "emails/h" value is raised to 100 (was locked to 2 before custom SMTP;
  Supabase's own UI enforces this — the field isn't editable at all without custom SMTP enabled).
  100/h is a deliberate ceiling, not "unlimited": it's comfortably under Resend's free-tier daily
  cap so a burst never bounces at Resend's end either. If Resend's plan is upgraded, this can go
  higher via that same Rate Limits field. Note this is a *separate* Resend API key/purpose from
  `lib/resend.ts`'s reminder-email sending — same account and domain, different consumer.
- `lib/billing.ts` — shared `createCheckoutSession()` helper used by both the paywall prompt and
  the billing settings page.
- Account deletion (`app/(dashboard)/settings/profile/actions.ts`) also cancels the Stripe
  subscription first — not just a DB delete — so a deleted account can't keep getting charged.

Every exported Server Action authenticates itself internally (`requireUser()`/
`requireOnboardedUser()`/an inline `getUser()` check) rather than relying on the page or layout
that happens to render its form — Server Actions are callable directly, so a layout-level guard
alone would not stop a crafted request. Verified file-by-file; keep doing this for new actions.

## Reminder engine

**Reminder schedule is a three-level cascade; payment link is a two-level cascade** — these were
deliberately made asymmetric after a UX review. Reminder schedule: invoice-level override →
client-level override → account default (`reminder_settings`) — the full 3 levels, because a
single invoice can genuinely need pausing/softening independent of the client's usual schedule
(e.g. a disputed invoice). Payment link: client-level override → account default
(`profiles.payment_link`) only, **no invoice-level override** — a payment link is a property of
*how you get paid*, tied to the client relationship or the business as a whole, not to one
invoice, so an invoice-level override was judged to add UI/resolution complexity without a real
use case. `invoices.payment_link` still exists as a DB column (from the original 2-level
payment-link design, before it was widened to invoice-level and then narrowed back) but the app
no longer reads or writes it anywhere — it's inert, not dropped via migration, since dropping it
would lose any values already set on existing invoices for no functional gain. Don't reintroduce
a payment-link `FormField` on the invoice form without re-deciding this.

`supabase/migrations/0004_customer_invoice_overrides.sql` adds `payment_link`, `reminder_offsets`,
`reminder_enabled` to `customers`, and `reminder_offsets`/`reminder_enabled` to `invoices`. All
override columns are nullable — `null` means "inherit," a real value (including an empty `[]`
offsets array, a deliberate "no reminders for this one" state) means "override active."
`reminder_offsets`/`reminder_enabled` are always written **together** by the app, never
independently, even though they're independently nullable at the DB level — see
`lib/reminder-override.ts`'s `encodeReminderOverride`/`decodeReminderOverride`, used by
`customer-form.tsx`, `invoice-form.tsx`, and the two Server Actions. The UI for "use default, or
customize just for this one" (`components/dashboard/reminder-override-section.tsx`) is shared
between the client form and the invoice form so the pattern doesn't have to be relearned between
them; `components/dashboard/reminder-offset-switches.tsx` is the actual Gentle/Firm switch grid,
shared three ways (global settings page, client override, invoice override) so all three render
and behave identically. Every place that resolves the effective reminder schedule (the detail
pages and the cron job below) uses the same `invoice ?? customer ?? account` order; every place
that resolves the effective payment link uses `customer ?? account` — don't resolve either
differently in a new call site. `lib/reminders.ts`'s `describeReminderSchedule(offsets, enabled,
t)` renders the resolved reminder schedule as plain text (e.g. "7, 3 days before · 1 day after")
for the detail pages, taking a next-intl translator so it works from both Server and Client
Components — see "Internationalization" below.

`app/api/cron/send-reminders/route.ts`, run daily:

1. Load **every** profile (not filtered by plan — see above) + their `reminder_settings`. Unlike
   before per-invoice/per-client overrides existed, `reminder_settings` is **not** filtered to
   `enabled = true` here — an account could have the default off but a specific client or
   invoice overridden back on, so that filter would have silently dropped real reminders. The
   effective `enabled` is resolved per invoice instead (`invoice.reminder_enabled ??
   customer.reminder_enabled ?? defaultSettings.enabled`), and invoices where that resolves to
   `false` are skipped individually.
2. For each unpaid invoice, collect every configured offset whose target date
   (`due_date + offset`) is **today or earlier** and not yet logged — "or earlier" is deliberate:
   it covers an invoice logged already overdue (offsets in the past the moment it's created) and
   makes a missed cron run self-healing, not a permanently lost reminder. Of that set, only the
   **most recent** (max target date) offset is actually sent; the rest are logged with
   `reminder_logs.status = 'skipped'` so they're never reconsidered and a backdated invoice
   doesn't fire every past milestone as an email storm on the first run.
3. Tone escalates with `offset_days` (`toneForOffset()` in `lib/reminders.ts`):
   `before` (≤0) → `overdue` (1–13 days) → `seriously_overdue` (`SERIOUSLY_OVERDUE_THRESHOLD_DAYS`
   = 14+, `emails/reminder-seriously-overdue.tsx`, firmer copy, no "feel free to ignore" softening).
   The reminder-settings UI only offers offsets up to 30 days after due — if `SERIOUSLY_OVERDUE_THRESHOLD_DAYS`
   ever changes, check it's still reachable through the presets in `reminder-settings-form.tsx`.
4. Each email optionally includes a "Pay now" button (`PayNowButton` in
   `emails/components/reminder-layout.tsx`) linking to `customers.payment_link ??
   profiles.payment_link` — a bring-your-own link (Stripe Payment Link, PayPal.me, etc.), not
   Stripe Connect. Chasry deliberately never touches the money itself; this avoids any
   money-transmission surface area for a v1.
5. Sent via Resend, `reply-to` set to the business owner's email. Logs `sent`/`failed`/`skipped` —
   this is what the reminder timeline on the invoice detail page reads from.

**Known limitation, not fixed**: date comparison is UTC-based, not per-user timezone. A reminder
can land a few hours off from a user's local midnight. Documented, acceptable for v1.

## UI structure

Route groups: `(auth)` — unauthenticated · `(onboarding)` — post-signup, pre-onboarding ·
`(dashboard)` — everything behind `requireOnboardedUser()`, with `DashboardShell`
(`components/dashboard/dashboard-shell.tsx`) providing the chrome and a small Free/Pro badge next
to the account name (not a persistent banner — the free-tier "nudge" only shows up contextually,
as `UpgradePrompt` at the actual paywall moment, matching the brand's "quiet, no awkward
conversations" tone rather than nagging on every page).

**Dashboard shell is a full-width header on top, with a left sidebar below it** — this went
through two redesigns: sidebar-only → header + horizontal top nav → header + sidebar (current).
The horizontal-nav middle version (`DashboardTopNav`) was removed entirely (deleted, not just
unused) once the user asked for the sidebar back but wanted to keep the new header. Current
structure in `dashboard-shell.tsx`: a sticky `<header>` spans the full viewport width (no
`max-w-*`/`mx-auto` wrapper around its content — that centering was the cause of an earlier bug
report that the logo looked "slightly right" instead of flush left on wide monitors), logo at the
true left edge (`h-10 sm:h-14`, much larger than the auth-page logo since this header has more
room), "Upgrade to Pro" + account dropdown at the right. Below the header, a `<div className="flex">`
holds a `hidden lg:flex` left `<aside>` with `DashboardNav` (vertical nav links) and the `<main>`
content area next to it. On mobile the sidebar is replaced by the same `Sheet`-based hamburger menu
as before (`DashboardNav` again, reused for both). `components/dashboard/nav-items.ts`'s order is
Dashboard → **Clients → Invoices** — Clients deliberately comes before Invoices (the user asked
for this explicitly; an invoice needs a client to exist first, so this also matches the order
you'd actually use them in).

**Settings lives only in the account menu (`UserMenu`, inline in `dashboard-shell.tsx`), not in
the sidebar** — the reverse of an earlier decision (Settings used to be sidebar-only, with the
account menu deliberately excluding it to avoid two paths to the same page). Revisited on a UX
pass: Settings/Billing/Reminders are occasional, account-level configuration, not something used
daily like the three sidebar items, so it doesn't deserve equal billing with them in the primary
nav — this matches the common SaaS pattern (Linear, Notion, Stripe) of keeping account-scoped
settings behind the avatar rather than in primary nav. `UserMenu` now carries Settings (→
`/settings/profile`), Help & FAQs, and Log out — the standalone "Billing" shortcut was folded into
the new Settings entry (billing is one tab inside Settings, and the "Upgrade to Pro" header button
already covers the direct-to-billing case) to keep the menu from growing back to duplicate paths.
Keep Settings in exactly one place; don't add it back to `nav-items.ts` without also removing it
from `UserMenu`.

Detail/edit/new pages under `(dashboard)` use `components/dashboard/back-link.tsx` (a small
"← Clients" / "← Invoices" / "← \<name\>" link above `PageHeader`) consistently — customer
detail → Clients, customer edit → that customer's detail page, invoice detail → Invoices, invoice
edit → that invoice's detail page, and the two "new" pages → their list (or, for
`invoices/new?customer_id=`, back to that specific client instead, since that's genuinely where
the user came from). Add a `BackLink` to any new page that isn't already reachable from a nav
item, rather than leaving "click the nav" as the only way back — that was a real reported gap on
the customer detail page.

The four "new"/"edit" pages (customer new/edit, invoice new/edit) also use
`components/dashboard/form-tips.tsx` — a small tinted card of 2-3 contextual tips, laid out in a
`lg:grid-cols-3` grid next to the form (form spans 2 columns, tips take the third) inside a
`max-w-4xl` wrapper. This replaced a plain `max-w-lg` single-column layout that left a large,
pointless gap on the right on any screen wider than the form itself — a real reported issue, not
just a nice-to-have. Keep tips short and specific to that page's action, not generic filler.

`(auth)`, `(onboarding)`, and `app/not-found.tsx` share `<SiteHeader>`
(`components/site-header.tsx`) — a slim sticky header with just the logo lockup — plus a
`bg-gradient-to-br from-white via-white to-brand-secondary-tint/40` page background and a single
centered white card (`rounded-2xl`, soft shadow). This deliberately mirrors chasry.com's actual
layout (confirmed by screenshotting it, not guessing): a small header logo, not a half-viewport
side panel with a giant logo/mascot — that was the original layout and was replaced after
looking wrong. Don't reintroduce a big side-panel logo on these pages.

**Logo size is pixel-matched to chasry.com, not guessed** — measured via `getBoundingClientRect()`
on the live site: its header renders at 85px tall with the logo icon at 56px tall. `SiteHeader`
and `DashboardShell`'s header both use `h-20` (80px) with the logo at `h-10 sm:h-14` (56px on
sm+), confirmed by re-measuring our own rendered header the same way (56px, matching exactly).
Both headers use identical sizing now — this went through several rounds (`h-7` → `h-9 sm:h-10`
→ current) chasing "still looks too small" feedback before actually measuring the target instead
of guessing again; if a future request says the logo looks wrong size, **measure chasry.com's
current header first** rather than incrementing the height again. `DashboardShell` uses the exact
same `/40` gradient (not a fainter variant) so the background reads identically before and after
login — it briefly used a fainter `/15` tint, which the user flagged as inconsistent with the
login screen; don't reintroduce a different opacity for one or the other without a reason.

All route groups — `(auth)`, `(onboarding)`, `not-found.tsx`, **and now `(dashboard)` too** —
share `<SiteFooter>` (`components/site-footer.tsx`): copyright, a "Help" link (to `/help`), a
"Contact us" mailto link, and Instagram/Facebook/TikTok icon links
(`components/icons/social-icons.tsx` — hand-drawn inline SVGs, since lucide-react deliberately
ships no brand/social logos). The `chasry.com` text link that used to sit here was removed —
redundant now that the footer appears inside the app itself, not just on marketing-adjacent pages.
Wired in via the standard sticky-footer flexbox pattern (`flex min-h-screen flex-col` on the
layout/shell, `flex-1` on `<main>`, footer last) — in `DashboardShell` this means the footer sits
below the `header + sidebar/main` flex row, not inside it, so it spans the full width undivided by
the sidebar.

`/help` (`app/help/page.tsx`) is a **public, un-gated page** — root-level, not inside any route
group, so it composes `<SiteHeader>`/`<SiteFooter>` itself rather than inheriting a layout. It's
reachable both logged out (footer "Help" link) and logged in (account dropdown "Help & FAQs"),
which is why it's public rather than living under `(dashboard)`. Content is a static FAQ list
(no accordion/collapse — no `Accordion` primitive is installed, and the FAQ is short enough that
a plain Q&A list is simpler) plus a "Still stuck?" mailto CTA at the bottom. Uses the same
`BackLink` (`href="/"`, generic "Back" label since there's no single true parent page — "/"
already smart-redirects to `/dashboard` or `/login` depending on auth state) as every other page
in the app, instead of the bottom-of-page "Back to Chasry" CTA it used to have — consistency with
the rest of the app's back-navigation pattern was judged more valuable than a page-specific CTA.

**Detail-page info grids use small `lucide-react` icons per field** (invoice detail: Wallet/
CalendarClock/User/Link2/StickyNote; customer detail: Phone/Link2/Bell/StickyNote) — a UX pass
judged the plain-text label grids too flat to scan quickly. Kept to one icon per field label, not
decorative elsewhere, to avoid icon noise.

Both `(auth)` and `(dashboard)` route groups have a `loading.tsx` (`Loader2` spinner, brand-primary
color) so route transitions show immediate feedback via React Suspense instead of a blank pause —
added after the user reported navigation "taking too much time" with nothing to indicate progress.

**Typography**: **Inter** (`next/font/google`, `--font-inter` in `app/layout.tsx`) — matches
chasry.com exactly (confirmed via computed styles on the live site: `Inter`, headline weight
800). Marketing-adjacent pages (auth, onboarding, not-found) use `font-extrabold` headings to
match the landing page's confident weight; in-app dashboard headings stay at the lighter
`font-semibold` used elsewhere (functional UI vs. a marketing moment — deliberate, not an
inconsistency). Fixed a real bug in the process: `globals.css` had `--font-sans: var(--font-sans)`
(self-referential/circular), so the app was likely never actually rendering the font it thought it
was — `--font-sans` now points at `--font-inter` explicitly.

Brand tokens live in `app/globals.css` as CSS variables (`--brand-primary`, etc., plus the
standard shadcn semantic tokens mapped onto them) — see `PROJECT.md` for the hex values, also
confirmed against `brand/palette/tokens.css`/`colors.md` (the machine-readable source the
designer provided — check there before changing any brand color). `--radius` is `0.875rem`
(bumped up from the shadcn default to match the landing page's rounder cards). `globals.css` also
respects `prefers-reduced-motion`, and `Button` sets `cursor-pointer` explicitly (Tailwind/shadcn
don't do this by default — it's the CLI's `--pointer` init flag, not applied here since it wasn't
passed).

## Theme (dark/light)

`components/theme-provider.tsx` wraps `next-themes`' `ThemeProvider` with `attribute="class"`,
`defaultTheme="light"`, `enableSystem={false}` — a visitor with no stored preference always sees
light, regardless of OS/browser theme. This briefly followed system preference
(`defaultTheme="system"`, `enableSystem`) when the toggle was first added, then was switched back
to a light default on request; `enableSystem` is off because `ThemeToggle` only ever sets an
explicit `"light"`/`"dark"` value, never `"system"`, so leaving system-detection enabled would be
inert. Once a user actually toggles the theme, `next-themes` persists that choice to
`localStorage` and it's respected on every later visit — this default only applies before that
first toggle. The dark-mode CSS tokens themselves already existed in `globals.css` from the
initial brand-token setup and are unaffected by this default — dark mode is still fully reachable
via the toggle, just not the theme a new visitor lands on. `components/theme-toggle.tsx`
(`ThemeToggle`) is a sun/moon icon button that **decides which icon and label to show purely via
CSS `dark:` variants — it must never branch on `resolvedTheme` during render.** Both icons and
both `sr-only` labels are always in the DOM; `dark:hidden`/`dark:block` picks one. This is the
same trick the dual logos below use, and it's load-bearing:

> **Corrects an earlier note in this file that was wrong.** A previous version branched at render
> time (`resolvedTheme === "dark" ? <Sun/> : <Moon/>`) and this file claimed that was safe because
> "`resolvedTheme` is `undefined` on both the server render and the client's first hydration pass."
> That is **not** true — `next-themes` injects a *blocking* inline script that reads `localStorage`
> and applies the theme before React hydrates, so for any visitor who had toggled to dark,
> `resolvedTheme` was already `"dark"` on the client's first render while the server had rendered
> `undefined`. The result was a genuine hydration mismatch (`aria-label` and the whole `<svg>`
> subtree differing), logged as a React error and forcing a subtree re-render on **every page
> load in dark mode**. It went unnoticed for a while because it only reproduces with a stored
> dark preference — a fresh visitor never sees it. Found by reading the *dev-server* logs, which
> carry the component stack; the browser console alone only showed the generic message. Don't
> reintroduce render-time theme branching. The other common fix — a `mounted` state guard — is
> also avoided here: it flashes the wrong icon for a frame and trips eslint's
> `react-hooks/set-state-in-effect`.

Reading `resolvedTheme` inside the `onClick` handler is fine (it runs after hydration). The
toggle's accessible name is translated (`header.lightMode`/`header.darkMode`) — it was previously
hardcoded English, missed in the i18n pass because it lived in an `aria-label` rather than visible
text. The toggle is rendered in both
`<SiteHeader>` (auth/onboarding/not-found) and `DashboardShell`'s header, next to
`LanguageSwitcher` (see i18n below). Every place that used to hardcode `bg-white`/`text-white`/
`from-white` instead of the `background`/`foreground` semantic tokens was swept and fixed as part
of this — a literal white background does not react to the class-based dark mode toggle, only the
CSS variables do. `SiteHeader` and `DashboardShell` also each render two `<Image>` logos
(`logo-light-bg.png` shown via `dark:hidden`, `logo-dark-bg.png` via `hidden dark:block`) rather
than one logo image, since the brand logo file itself isn't theme-aware.

**Dark-mode `--brand-primary` was fixed for text contrast, not just "enabled"** — a later UI/UX
pass measured actual contrast ratios in the browser (not just eyeballed) and found the original
dark-mode value (`#3f63b8`, a straight-line lightening of the light-mode navy) gave only ~3:1
against the app's dark background/card/tint surfaces, failing WCAG AA (4.5:1) for the ~25 places
across the app that use `text-brand-primary` as a link/badge/active-nav-item color — this had
been live and unnoticed since dark mode was enabled. Fixed by lightening `--brand-primary` to
`#7b9bdb` (6.25:1+ against background/card/tint) and `--brand-primary-hover` to `#8bacdf`
(fixes the Pro-plan badge, the only remaining dark-mode consumer of that token) — **only** in the
`.dark` block in `app/globals.css`; light mode was already fine (7.5:1+) and untouched. The one
place `--brand-primary` is used as a *background* rather than text — `DashboardShell`'s account-menu
avatar circle (`bg-brand-primary text-white`) — would have broken the other way if lightened (white
text needs a darker background), so it keeps the original value via an explicit
`dark:bg-[#3f63b8]` override instead of the CSS variable. If a new dark-mode background usage of
`--brand-primary` is ever added, it needs the same kind of explicit override rather than assuming
the variable is background-safe. Verified by computing actual sRGB relative-luminance contrast
ratios in the running app (not by eye) for the badge, avatar, and a representative link, in both
themes, before and after.

## Internationalization (i18n)

`next-intl`, in **cookie-based locale mode** — not the library's URL-segment routing
(`app/[locale]/...`), which would have meant restructuring every existing route under a dynamic
segment. Instead:

- `lib/locale.ts` — pure constants only (`LOCALES = ["en", "el"]`, `DEFAULT_LOCALE`,
  `LOCALE_COOKIE`, `LOCALE_LABELS`). **Deliberately has no `next/headers` import** — it's pulled in
  by `components/language-switcher.tsx`, a Client Component, and `next/headers` APIs are
  Server/Route-Handler-only; a `cookies()`-based `getLocale()` helper briefly lived in this file
  and broke the production build (`next build` failure: "You're importing a module that depends on
  'next/headers' ... in the Pages Router" — Turbopack's message for a server-only import reaching
  a Client Component bundle) until it was moved out. Don't re-add a server-only import to this
  file; put server-only locale helpers in `i18n/request.ts` or a call site directly instead.
- `i18n/request.ts` — the `next-intl` plugin config (wired into `next.config.ts` via
  `createNextIntlPlugin("./i18n/request.ts")`). Reads the `chasry_locale` cookie server-side per
  request, falls back to `DEFAULT_LOCALE`, and dynamically imports `messages/{locale}.json`.
- `lib/locale-actions.ts` — `"use server"` `setLocale(locale)`: validates against `LOCALES`, sets
  the cookie (`path: "/"`, 1-year `maxAge`, `sameSite: "lax"`), and `revalidatePath("/", "layout")`
  so the new locale takes effect immediately without a full reload.
- `app/layout.tsx` (root) calls `getLocale()`/`getMessages()` from `next-intl/server` and wraps
  `children` in `<NextIntlClientProvider messages={messages}>` — passing the **full** messages
  object (not scoped per-route), so every Client Component anywhere in the tree can call
  `useTranslations()` without additional provider wiring. `<html lang={locale}>` is set from the
  same call.
- `components/language-switcher.tsx` (`LanguageSwitcher`) — a dropdown (globe/languages icon)
  calling `setLocale()` inside `startTransition`. Rendered next to `ThemeToggle` in both
  `<SiteHeader>` and `DashboardShell`.
- `messages/en.json` / `messages/el.json` — namespaced by feature area (`common`, `nav`, `header`,
  `footer`, `auth.*`, `onboarding`, `notFound`, `help`, `dashboard`, `customers`, `invoices`,
  `reminderOverride`, `offsetPicker`, `reminderTimeline`, `settings.*`, `upgradePrompt`, etc.) —
  covers all page chrome, navigation, forms/validation labels and hints, empty states, the FAQ
  list, and settings. Uses ICU features directly rather than app-side string-building: plural
  rules (`offsetPicker`'s `{days, plural, one {...} other {...}}` for "1 day before due" vs.
  "3 days before due", correct in both English and Greek since both use the same one/other plural
  categories) and rich-text tags (`onboarding.businessNameConfirm`'s `<strong>{name}</strong>`,
  rendered via `t.rich()` with a `strong` chunk-renderer) instead of splitting strings and
  reassembling them with JSX, which would break translators' ability to reorder words per
  language.
- Server Components call `getTranslations()` (from `next-intl/server`, `await`ed); Client
  Components call `useTranslations()` (from `next-intl`). Several previously-plain Server
  Components were converted to `async` specifically to support this
  (`InvoiceStatusBadge`, `OnboardingChecklist`, `UpgradePrompt`, `ReminderTimeline`) — safe here
  because none of them were ever rendered from a Client Component; check that before doing the
  same to a new component; if it's rendered from a Client Component, translate the label at the
  call site instead and keep the leaf component's props as plain strings, or accept the
  translator as a prop/parameter (the pattern `lib/reminders.ts`'s `describeReminderSchedule`
  uses — it takes a scoped translator function as its third argument so both a Server Component
  and `reminder-override-section.tsx`, a Client Component, can call it).
- `SiteFooter` becoming `async` (it now calls `getTranslations("footer")`) meant it could no
  longer be imported and rendered directly inside `DashboardShell`, which is a Client Component —
  an async Server Component can't be instantiated inline from client code. Fixed by having
  `app/(dashboard)/layout.tsx` (a Server Component) render `<SiteFooter />` itself and pass it
  into `DashboardShell` as a `footer` prop (`React.ReactNode`) instead. The other three call sites
  (`(auth)`/`(onboarding)` layouts, `not-found.tsx`) are already Server Components, so they render
  `<SiteFooter />` directly, unchanged.
- **Not yet translated**: Server Action validation/success messages (Zod schema error strings,
  "Saved." toasts returned from `useActionState`) — these come back as plain English strings from
  the action layer regardless of the selected locale. Translating them would mean threading a
  locale-aware translator into every Server Action, a larger change than the page/component-level
  coverage done here. Flagged as a follow-up, not done in this pass.

## List pages (invoices, customers)

Both list pages (`app/(dashboard)/invoices/page.tsx`, `.../customers/page.tsx`) follow the same
URL-driven pattern, no client-side data-table library: filter/search/sort state all lives in
`searchParams` (`filter`, `q`, `sort`, `dir`), read server-side, applied in JS after a single
unfiltered Supabase fetch, and rendered as plain links/a GET `<form>` — consistent with how the
invoices status-filter tabs already worked before search/sort existed. Shared pieces:

- `lib/utils.ts`'s `buildListHref(pathname, currentParams, overrides)` — merges new params over
  the current ones and drops empty values, so filter/sort links don't accumulate stale query
  params.
- `components/dashboard/table-search.tsx` — a plain GET `<form>` (no client JS) with hidden
  inputs carrying the other current params through, so searching doesn't reset filter/sort.
- `components/dashboard/sortable-head.tsx` — a `<TableHead>` wrapping a link that toggles
  `sort`/`dir`, with an up/down/neutral icon reflecting current state.
- `components/dashboard/clickable-table-row.tsx` — a client component wrapping `TableRow` with
  an `onClick` router push, so the **entire row** (including cell padding, not just the linked
  text) navigates to the detail page. Per-cell `<Link>` wrapping (the previous approach) only
  made the rendered text clickable, not the row — a real reported bug, fixed by switching every
  list table to this component instead of Links-in-cells.
- Sorting is done entirely in JS after fetch (not `.order()` in the Supabase query), since
  "sort by client name" requires the separately-fetched customer-name join and can't be pushed
  into a single query without one; keeping sort logic in one place (JS) rather than split
  between DB-pushed and JS-computed fields was simpler than optimizing the common case.

**Mobile card view (invoices only)**: the invoices table has 5 columns (Client, Invoice number,
Due, Amount, Status) — too many to fit a 375px viewport without horizontal scrolling, which a
UI/UX pass flagged as a real clarity problem, not just a cosmetic one. Both the invoices list page
and the customer detail page's own invoices table now render two alternate layouts for the same
data: a `sm:hidden` stacked card list and a `hidden sm:block` table, sharing one row component —
`components/dashboard/invoice-list-item.tsx` (`InvoiceListItem`, an async Server Component reading
its own translations). The same component also renders the dashboard's "Due soon" list, so all
three surfaces show invoices identically. The customers list only has 3 columns (Name, Email,
Phone, with Phone already `hidden sm:table-cell`) — judged not to need a separate mobile layout,
since 2 visible columns already fit without scrolling; it got a small-avatar-initial treatment
(`bg-brand-primary-tint` circle with the first letter) in the Name cell instead, for scannability.

**Due-date urgency**: `lib/reminders.ts`'s `dueStatusLabel(daysUntilDue, t)` renders "3 days left" /
"Due today" / "2 days overdue" (ICU plural, via a next-intl translator scoped to the "invoices"
namespace) next to raw due dates — added after a UX review concluded that a bare date forces the
reader to do the subtraction themselves, which is exactly the kind of thing a beginner-friendly
list shouldn't require. Shown in `InvoiceListItem`, the invoices table's Due column (desktop), and
the invoice detail page's Due field — only when `status === "unpaid"` (paid/canceled invoices
don't need urgency framing). Every call site takes `daysUntil(dueDate)` from `lib/format.ts` and
passes it straight in; don't recompute the day-math differently at a new call site.

## Forms & validation

Every form the user directly complained about (auth: login/signup/reset-password/confirm;
onboarding) uses `react-hook-form` + `zodResolver` **directly in the component** — `mode:
"onBlur"`, `reValidateMode: "onChange"` — paired with `<FormField>`
(`components/ui/form-field.tsx`, label + input + inline red error text, `labelAction` slot for
things like a "Forgot password?" link next to the label) and `Input`'s existing
`aria-invalid:border-destructive` styling (already wired in the shadcn component, just needed
`aria-invalid={!!errors.field}` set on each input). Every password field on these forms uses
`<PasswordInput>` (`components/ui/password-input.tsx`) instead of a bare `<Input type="password">`
— it's `Input` plus a show/hide eye toggle button (local `useState`, `type="button"` so it can't
submit the form, `tabIndex={-1}` so it doesn't intercept normal tab order), forwarding every other
prop straight through so it drops into `register()`/`{...props}` spreads unchanged.

The Server Action underneath is unchanged (`useActionState`, top-level error banner for
server-side failures like "incorrect password") — react-hook-form only replaces *client-side*
validation feedback. The bridge: `handleSubmit`'s `onValid` callback gets the validated,
typed data, converts it with `toFormData()` (`lib/utils.ts`) and calls the `useActionState`
dispatcher (`formAction`) directly as a plain function — that dispatcher is callable outside a
`<form action>` binding, it doesn't have to be wired to the form's `action` prop.

**Gotcha, already hit once**: calling that dispatcher directly from `onValid` must be wrapped in
`startTransition(() => formAction(toFormData(data)))` (`import { startTransition } from "react"`).
Without it, React throws "An async function with useActionState was called outside of a
transition" at runtime — native `<form action={formAction}>` bindings get this transition wrapping
for free, but a plain function call from a react-hook-form `onSubmit` handler doesn't. Hit and
fixed in `login/page.tsx`, `signup/page.tsx`, `reset-password/page.tsx`, and
`onboarding-form.tsx` — any new form built on this pattern needs the same wrapper.

**Tried and abandoned**: a generic `useZodForm(schema)` wrapper hook. Don't recreate it — Zod 4's
inferred input/output types (relevant here because `optionalUrl` in `lib/validations/shared.ts`
transforms `""` → `null`, so a schema's input and output shapes differ) don't survive being
routed through an extra generic function boundary; TypeScript can't prove `z.infer<Schema>`
satisfies RHF's `FieldValues` constraint that many layers down. Calling `useForm<Input, unknown,
Output>({ resolver: zodResolver(schema) })` directly in each component (verbose, but every type
resolves cleanly) is the pattern that actually works — see any of the auth pages, or
`onboarding-form.tsx` for the 3-generic form (`z.input<Schema>`/`unknown`/`z.infer<Schema>`) needed
when the schema has a `.transform()`.

**Dashboard CRUD forms (customer/invoice/profile/reminder-settings) are now on this same
pattern too** — they were deliberately left on plain `FormData` + server-side-only Zod at first
(scope decision, not an oversight), but the user later asked for "real validation, not HTML
validation" and the same error/success UI everywhere, which made that split inconsistent. All
four now use `useForm<Input, unknown, Output>({ resolver: zodResolver(schema) })` +
`<FormField>` + `toFormData()` + `startTransition`, identically to the auth pages. Two things
that came up converting them, worth knowing before touching these forms again:

- **`toFormData()` used to drop `null` values from the payload, same as `undefined`.** That's
  wrong for a "clear this optional field" case (phone, notes, invoice number, payment link):
  zod's `.transform((v) => (v ? v : null))` output is `null` when cleared, and `toFormData`
  silently *omitting* that key meant the field was never sent to the server at all — a
  `.update()` call with a missing key leaves the old value in place instead of blanking it out.
  Fixed in `lib/utils.ts`: `null` → empty string (what an empty native `<input>` would have
  submitted), `undefined` → still omitted (genuinely not-applicable fields, e.g. `next` on
  login). Every optional-string schema field should transform blank to `null`, never
  `undefined` — see `optionalUrl` and the new `optionalText()` helper in
  `lib/validations/shared.ts`, both `customer.ts` and `invoice.ts` use it now.
- **`invoice-form.tsx`'s customer `Select` and `reminder-settings-form.tsx`'s `Switch`es no
  longer need the hidden-input-mirroring workaround** described in the Stack section's "Critical
  gotcha" above — react-hook-form's `Controller` (for the `Select`) and `watch`/`setValue` (for
  the `Switch`es, via `handleSubmit` building `FormData` manually since the server action still
  reads individual `offset_${n}` keys) read from RHF's own state instead of the native DOM, so
  the "Radix doesn't post to native FormData" problem doesn't apply once a form is on this
  pattern. It still applies to any *new* form that stays on plain `FormData` — the gotcha note
  is left in place for that case.

## `not-found.tsx`

Root-level only (`app/not-found.tsx`) — a `notFound()` call from inside `(dashboard)` pages
(customer/invoice detail when the ID doesn't belong to the user) renders this same page, dropping
the dashboard chrome. Acceptable trade-off for now; a dashboard-scoped not-found is a reasonable
future addition, not done here.

Uses the same `<SiteHeader>` + gradient + centered layout as auth/onboarding. The mascot image on
this page needs `priority` — without it, `next/image`'s lazy-loading never actually fired the
request in this route (confirmed via `document.images[...].complete` staying `false` with no
network request ever sent, specific to this special Next.js route type). Every other mascot usage
in the app is below the fold or in a state that's fine to lazy-load; this one isn't.

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
- Theme + i18n batch: `tsc`/`eslint`/`next build` clean; live in-browser check via the dev server
  (not placeholder-only this time) confirmed dark mode renders correctly across the authenticated
  dashboard shell and toggles back to light correctly, and confirmed the language switcher renders
  both English and Greek correctly (including ICU plural/rich-text interpolation) on the login,
  signup, and help pages, in both toggle directions, with the choice persisting across navigation
  via the `chasry_locale` cookie.
- **Full-app UI/UX + responsiveness review**, logged in as a real user (not placeholder-only):
  every page — dashboard, both list pages, all four customer/invoice CRUD forms, all three
  settings tabs, help, 404 — checked at 375/768/1280/1440px via DOM/computed-style inspection
  (`document.documentElement.scrollWidth` overflow checks, element bounding rects) rather than
  screenshots, since the Browser pane wasn't visible to take them. Found and fixed 4 real issues
  this surfaced that `tsc`/`eslint`/build couldn't have caught: the reminder timeline's cramped
  single-row layout on mobile (see "List pages" above), a "1 days before" pluralization bug (see
  `describeReminderSchedule` note above), two now-stale copy strings left over from the payment-link
  simplification (`settings.profile.paymentLinkHint` claiming a per-invoice override still existed;
  the currency FAQ claiming a per-invoice override that was never actually implemented — the
  invoice form's `currency` field is a hidden input, always the account default), and the dark-mode
  contrast bug described in "Theme" above — the most significant one, found by actually computing
  contrast ratios rather than eyeballing colors. Didn't verify `(auth)`/`(onboarding)` pages that
  need a fresh/unauthenticated session to reach naturally (`reset-password/confirm`,
  `signup/confirmed`, `onboarding` itself) — reviewed by code only.

## Open items (not yet done)

- The packaged `/security-review` skill couldn't run — it diffs against a GitHub `origin/HEAD`
  remote, which this repo doesn't have (local-only, not pushed anywhere yet). Once it's pushed,
  run the real skill (and consider `/code-review ultra` for a deeper multi-agent pass) rather
  than relying solely on the manual pass above.
- Sentry isn't actually integrated despite the env var placeholder.
- No automated tests exist (unit or e2e).
- `FREE_INVOICE_LIMIT = 3` is a starting guess, not validated against real usage.
- i18n coverage stops at the page/component layer — Server Action validation errors and success
  toasts are still English-only regardless of the selected locale (see "Internationalization"
  above).
