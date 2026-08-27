# Chasry — Architecture (as built)

Technical reference: stack, schema, and API surface as they actually ended up, not just as
planned. Trust this file over memory of the original plan.

This file holds only rules that apply regardless of what you're working on. Area-specific detail
lives in `docs/` and is **not** auto-loaded, read the relevant one when a task touches that area:

| File | Read before touching |
|---|---|
| `docs/stripe.md` | Stripe account/webhook/checkout/portal setup |
| `docs/database.md` | A migration, or a query against a table not summarized below |
| `docs/admin.md` | Any `/admin` page or `app/admin/actions.ts` |
| `docs/api.md` | Adding/changing a Route Handler or Server Action |
| `docs/reminder-engine.md` | Reminder scheduling, cascade resolution, or the cron job |
| `docs/ui-structure.md` | Dashboard chrome, route-group layout, landing/legal pages |
| `docs/sentry.md` | Sentry init, alerting, or a new `captureException` call |
| `docs/theme.md` | `theme-provider.tsx`, `theme-toggle.tsx`, or dark-mode colors |
| `docs/i18n.md` | A new translated surface, or Server Action validation messages |
| `docs/list-pages.md` | The invoices/customers list pages, or a new list page |
| `docs/forms.md` | Adding or editing any form |

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) — Server Actions for all CRUD, Route
  Handlers only for the two endpoints an external system calls into.
- **Supabase** — Postgres + Auth + Row Level Security.
- **Stripe Billing** — Checkout + Customer Portal + webhooks. Single Pro price, no trial.
- **Resend** + React Email — reminder emails, sent from `reminders@chasry.com`.
- **Vercel** — hosting (Pro plan) + Cron (`vercel.json`, daily at 07:00 UTC).
- **Tailwind CSS v4 + shadcn/ui** on **Radix UI** (`radix-ui` package, not `@base-ui/react`,
  which is the shadcn CLI's current default). Check `components.json` still says
  `"style": "radix-nova"` after any `npx shadcn add`.
- Forms use `useActionState` (Server Action round-trip: pending state, top-level server errors)
  **combined with** `react-hook-form` + `zodResolver` (client-side field validation), see
  `docs/forms.md`. Don't remove react-hook-form without replacing the validation pattern
  everywhere it's used.
- **Critical gotcha**: this installed `radix-ui` version's `Select`/`Switch` render no hidden
  native form control, so `<Select name="x">`/`<Switch name="x">` inside a plain
  `<form action={serverAction}>` silently submits nothing for that field. Any *new* plain-
  `FormData` form (not react-hook-form) using `Select`/`Switch` needs a controlled
  `value`/`checked` + a hand-written `<input type="hidden" name="x" value={...}>` mirroring it,
  see `invoice-form.tsx`/`profile-form.tsx`/`reminder-settings-form.tsx` for the pattern. Forms
  already on react-hook-form (`Controller`/`watch`/`setValue`) are unaffected.
- **Sentry** (`@sentry/nextjs`) is integrated, see `docs/sentry.md`. **Upstash** rate limiting is
  wired but **inert**: `lib/rate-limit.ts` short-circuits to `{ success: true }` unless
  `UPSTASH_REDIS_REST_URL`/`_TOKEN` are set, so login/signup/reset (10/min per IP) and the cron
  (5/min) are currently unthrottled. No code change needed to switch it on, just set the two env
  vars.
- **`npm run lint` deliberately does *not* pass `--quiet`** (warnings must stay visible). Expect
  **2 standing warnings**, `react-hooks/incompatible-library` on `watch()` in `invoice-form.tsx`
  and `reminder-settings-form.tsx` — advisory only, inert unless React Compiler is enabled (it
  isn't). If it ever is, switch those `watch()` calls to `useWatch()`. Don't re-add `--quiet`.
- `shadcn` and `react-email` are **devDependencies** (CLI-only, never imported by app code).
  `@react-email/components` (the runtime email library, used in `emails/`) stays a real
  dependency, don't move it.

## Pricing & plan gating

See `PROJECT.md` for the reasoning. Mechanically:

- `lib/plan.ts` — single source of truth: `FREE_INVOICE_LIMIT` (3), `isPro(status)`
  (`'active' | 'past_due'` → Pro; `'none' | 'canceled'` → Free), `planLabel()`.
- No subscription gate blocks access anywhere. The only thing that differs by plan is whether
  creating/reopening an invoice is allowed once `FREE_INVOICE_LIMIT` active (unpaid) invoices
  already exist.
- The limit is enforced **twice**: once in the UI (`invoices/new/page.tsx` shows `UpgradePrompt`
  instead of the form at the cap) and once server-side in `createInvoice`/`reopenInvoice`
  (`app/(dashboard)/invoices/actions.ts`) — the UI check is not the real gate; Server Actions are
  callable directly, so every mutation re-checks authorization itself.
- Onboarding never touches Stripe, it only collects `business_name`/`timezone`/`currency` and
  sets `onboarded_at`. Upgrading happens later via `lib/billing.ts`'s `createCheckoutSession()`
  (no `trial_period_days`, the free plan serves that purpose).

## Database — quick rule

**Migrations are applied with the Supabase CLI, never by pasting into the dashboard SQL editor**:
`npm run db:status` / `db:push` / `db:diff`. `db:push` is ledger-tracked and safe to re-run, use
`--dry-run` first on anything destructive. See `docs/database.md` for the full schema, table by
table, and the migration-workflow detail (why migrations aren't run by the app itself).

## Supabase client pattern (`lib/supabase/`)

- `client.ts` — browser client (anon key).
- `server.ts` — Server Components/Actions, RLS-scoped to the calling user's session.
- `admin.ts` — service-role key, **bypasses RLS**. Only ever imported by the cron route, the
  Stripe webhook handler, and the admin section (see `docs/admin.md`) — all three run
  without/beyond a normal user session. Never import this anywhere a request is on behalf of a
  specific browser user.

## Auth & request-scoped caching (`lib/auth.ts`)

- `proxy.ts` (renamed from `middleware.ts` in Next.js 16) refreshes the Supabase session cookie
  and redirects. Logic lives in `lib/supabase/middleware.ts`, keyed on an explicit
  `PROTECTED_PREFIXES` allowlist (`/dashboard`, `/invoices`, `/customers`, `/settings`,
  `/onboarding`), **not** "everything except a few public paths" — a blocklist would send a
  logged-out visitor's mistyped/nonexistent URL to `/login` before Next.js ever renders
  `not-found.tsx`. Any *new* protected route needs adding to `PROTECTED_PREFIXES` (though every
  page still checks auth itself server-side regardless). `login()` reads a `next` param
  (validated by `safeNextPath()`, same-origin relative paths only, no open redirect) and returns
  the user to where they were headed.
- The middleware bounces an already-logged-in visitor away from `PUBLIC_AUTH_PATHS` (`/login`,
  `/signup`, `/reset-password`) to `/dashboard`, **except** `SESSION_ACTION_PATHS`
  (`/reset-password/confirm`, `/signup/confirmed`) — pages that consume a one-time emailed link
  and have Supabase establish a session on arrival as a side effect. Any new page of that shape
  needs adding to `SESSION_ACTION_PATHS`, or the "already logged in" redirect fires before the
  visitor sees the confirmation.
- `requireUser()` — auth-only check (redirects to `/login`). Use on pages that don't need the
  `profiles` row.
- `requireOnboardedUser()` — auth + onboarding check, returns `{ supabase, user, profile }`.
  Called by `app/(dashboard)/layout.tsx` itself, gating every dashboard page. A page that
  additionally needs `profile` should call `requireOnboardedUser()` again rather than fetching
  `profiles` separately.
- Both are backed by `React.cache()` (`getAuthedUser`/`getProfile` in `lib/auth.ts`), so the auth
  check and profile fetch each run once per request, not once per component. Don't reintroduce ad
  hoc `supabase.from("profiles").select(...)` calls in dashboard pages, extend `getProfile`'s
  column list instead so the cache stays the one source.

## API surface — quick rules

Route Handlers exist only for the two endpoints an external system calls into (Stripe webhook,
Vercel Cron); everything else is a Server Action. Every exported Server Action authenticates
itself internally rather than relying on the page/layout that renders its form, Server Actions
are callable directly. The cron secret is compared with `crypto.timingSafeEqual`, not `===`. See
`docs/api.md` for the full endpoint/action listing and the Supabase-email-quota gotcha.

## Production deploy checklist

Several things in this app are wired but **inert until configured in Vercel**, and every one of
them fails *silently* rather than erroring, that's the common thread.

**Before / during the deploy:**

1. **Env vars in Vercel** — the app builds and runs fine without these, it just quietly does less:
   - `NEXT_PUBLIC_SENTRY_DSN` — without it production reports **nothing**.
   - `CRON_SECRET` — must match `.env.local`'s current value (32 random bytes). A mismatch means
     every cron run 401s.
   - `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` — the **live** key and
     **`price_1U7k0RRtidinAV69745bycOw`**. `.env.local` holds test-mode values on purpose.
   - `STRIPE_WEBHOOK_SECRET` — created *by* step 2b below, not copied from `.env.local`.
   - `SENTRY_AUTH_TOKEN` *(optional)* — source maps, so stack traces aren't minified.
   - `UPSTASH_REDIS_REST_URL` / `_TOKEN` *(optional)* — switches rate limiting on.
   - Env var changes need a **redeploy** to take effect.
2. **Reconnect Vercel's Git integration** — Vercel links through its GitHub App, and the change
   of owner during the org transfer commonly breaks it. Silent failure mode: pushes stop
   triggering deploys, with no error anywhere. Check Vercel → Project → Settings → Git.
2b. **Create the live Stripe webhook endpoint** — Developers → Webhooks →
   `https://<app>/api/stripe/webhook`, subscribed to `checkout.session.completed`,
   `customer.subscription.created|updated|deleted`. Stripe hands back the live `whsec_…`, that is
   `STRIPE_WEBHOOK_SECRET` in Vercel. Until this exists, **people can pay and never get Pro**.
3. **Run `npm run db:push`** — migrations aren't part of the deploy pipeline yet.

**After the first production deploy, verify, don't assume:**

4. **Confirm alerts actually reach the inbox.** Every layer of this chain is currently unproven
   *in production*: DSN set in Vercel → SDK enabled (`sentryEnabled` requires `VERCEL_ENV` to be
   `production`/`preview`) → issue created → alert rule matches → email sent. Trigger one
   deliberate error from the deployed app and check that an email actually arrives, not just that
   the issue appears in the dashboard. Resolve the test issue afterwards.
5. **Confirm the cron ran and checked in.** After the first 07:00 UTC run, the `send-reminders`
   monitor should show a green run tagged `production`. Sentry only starts alerting on *missed*
   runs once it has seen real ones.
6. **Scope the alert rule to production** — Alerts → "Send a notification for high priority
   issues" → Edit → Filter Issues → `production`. Cannot be done earlier, Sentry's dropdown only
   offers environments it has already received events from.

## Open items (not yet done)

- **`/signup` doesn't hydrate on a fresh/hard page load, in this dev environment at least.** A
  hard navigation (typing the URL, a real reload, an email link, `curl`) leaves the signup
  `<form>` inert, submit does a native JS-free GET instead. `/login`, built the same way, hydrates
  correctly on the same kind of hard load every time; client-side navigation *to* `/signup` also
  hydrates fine. Not yet root-caused. Worth checking whether it reproduces outside this sandboxed
  dev setup (a real browser, `next build && next start`) before spending real time on it. If it
  does reproduce for real, it blocks new users signing up from a cold link (email, bookmark,
  typed URL), which is most of them, so it would be worth prioritizing.
- Migrations are CLI-managed (`npm run db:push`) but that push is still **manual**, not wired
  into the Vercel deploy, so schema and code can ship out of step. Worth adding as a deploy step
  once there's real traffic.
- The repo has a GitHub remote (`origin` → `Devroic/chasry-webapp`, private), so the packaged
  `/security-review` skill and `/code-review ultra` should work now, worth running them over the
  auth/billing/RLS surface rather than relying on manual passes alone.
- Sentry source maps aren't uploaded, see "Production deploy checklist" above for the rest of the
  Sentry go-live steps.
- **Upstash rate limiting is wired but inert**, see "Stack" above, just needs the two env vars.
- **If the repo is renamed `Devroic/chasry-webapp` → `Devroic/chasry`, re-point Sentry too.**
  Planned around deployment, breaks *quietly* rather than erroring:
  - **Unaffected**: `next.config.ts`'s `org`/`project` (Sentry slugs, not GitHub names); the
    GitHub integration's repo access (installed org-wide over `Devroic`).
  - **Must be updated**: Code Mappings / stack-trace linking (Settings → Integrations → GitHub →
    Configurations → Code Mappings) and release/suspect-commit association, both name a single
    repo. After a rename, stack traces stop linking to source with no error anywhere.
  - Worth doing at the same time: the Sentry project slug is still the default
    `javascript-nextjs`, referenced in `next.config.ts`, change both together or source-map
    uploads start failing.
- No automated tests exist (unit or e2e).
- `FREE_INVOICE_LIMIT = 3` is a starting guess, not validated against real usage.
- i18n coverage stops at the page/component layer for a couple of surfaces, Server Action
  validation errors and success toasts are localized (see `docs/i18n.md`), but this should be
  re-verified as new forms are added.
