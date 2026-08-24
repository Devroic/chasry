# Chasry

Chasry sends automatic, polite reminders to your clients about unpaid invoices, until you
get paid. This is the production web app — sign up, log an invoice, Chasry chases it for you.

## Stack

- **Next.js 16** (App Router, TypeScript, Server Actions) — Tailwind CSS + shadcn/ui (Radix)
- **Supabase** — Postgres, Auth, Row Level Security
- **Stripe** — Billing (Checkout, Customer Portal, webhooks) — free plan + €10/month Pro, no trial
- **Resend** + React Email — reminder emails
- **Vercel** — hosting + Cron (daily reminder job)
- **Upstash Redis** (optional) — rate limiting on auth + cron
- **Sentry** (optional) — error monitoring

## 1. Prerequisites

Create free/low-cost accounts on:

1. [Supabase](https://supabase.com) — database, auth
2. [Stripe](https://dashboard.stripe.com/register) — billing
3. [Resend](https://resend.com) — email sending
4. [Vercel](https://vercel.com) — hosting (Pro plan, $20/mo, required for commercial use + Cron)
5. *(optional)* [Upstash](https://upstash.com) — free Redis for rate limiting
6. *(optional)* [Sentry](https://sentry.io) — free error monitoring

## 2. Install

```bash
npm install
cp .env.example .env.local
```

## 3. Supabase setup

1. Create a new Supabase project.
2. Open the **SQL Editor** and run the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) once. This creates
   every table, Row Level Security policy, and trigger the app needs.
3. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server-only, never expose this**)
4. In **Authentication → URL Configuration**, set the Site URL to your app URL (e.g.
   `http://localhost:3000` for now, your production URL later) and add
   `<site-url>/reset-password/confirm` as an additional redirect URL.
5. By default Supabase requires email confirmation on signup — that's what we want; leave it on.

## 4. Stripe setup

1. In the Stripe Dashboard, create a **Product** called "Chasry" with a **recurring monthly
   Price of €10.00**. Copy the Price ID (`price_...`) → `STRIPE_PRICE_ID`.
2. **Developers → API keys**: copy the **Secret key** → `STRIPE_SECRET_KEY`, and the
   **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. **Settings → Billing → Customer portal**: turn the portal on so `openBillingPortal` works
   (defaults are fine — allow plan cancellation, don't need to allow plan switching since there's
   only one plan).
4. **Developers → Webhooks → Add endpoint**:
   - URL: `https://<your-domain>/api/stripe/webhook` (use the Stripe CLI locally instead — see
     below — you can't point a real webhook at localhost)
   - Events to send: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

For local development, use the [Stripe CLI](https://stripe.com/docs/stripe-cli) instead of a
dashboard webhook:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This prints a webhook signing secret starting with `whsec_...` — use that as
`STRIPE_WEBHOOK_SECRET` while developing locally.

## 5. Resend setup

1. Create an API key → `RESEND_API_KEY`.
2. Add and verify `chasry.com` as a sending domain in Resend. It'll give you a handful of DNS
   records (a domain-verification TXT, one or more DKIM CNAMEs, and an SPF-related record).
3. Add those records in **Namecheap → Domain List → chasry.com → Advanced DNS**. These are a
   different record type (TXT/CNAME) from the MX records your existing `info@chasry.com`
   forwarding uses — adding them does **not** break that forwarding.
4. Once verified, set `RESEND_FROM_EMAIL="Chasry <reminders@chasry.com>"`.
5. Until DNS is verified, you can develop against Resend's shared test sending — reminder emails
   just won't be deliverable to real inboxes yet.

## 6. Fill in the rest of `.env.local`

- `CRON_SECRET`: any long random string (e.g. `openssl rand -hex 32`). You'll set the same value
  in Vercel later — Vercel automatically sends it as `Authorization: Bearer <CRON_SECRET>` on
  every cron request when that env var is present, which is what `/api/cron/send-reminders`
  checks.
- `NEXT_PUBLIC_APP_URL`: `http://localhost:3000` locally, your real domain in production.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (optional): from an Upstash Redis
  database. Without these, rate limiting is a no-op — fine for local dev, not recommended left
  off in production.
- `ADMIN_EMAILS`: comma-separated list of email addresses allowed into the internal `/admin`
  section (user counts, subscription lookups, the Stripe playbook). Anyone else hitting `/admin`
  gets a plain 404, not a redirect. Set the same value in Vercel.

## 7. Run it

```bash
npm run dev            # app at http://localhost:3000
npm run email:dev       # preview the reminder email templates at http://localhost:3001
stripe listen --forward-to localhost:3000/api/stripe/webhook   # in a second terminal
```

Sign up, complete onboarding (no card needed — you land on the free plan), add a client, add an
invoice due today, then manually trigger the reminder cron to see it work end to end:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/send-reminders
```

Or, from any invoice's detail page in the app, use **"Send me a preview"** to email yourself a
sample reminder without waiting for the cron.

To test the upgrade flow: add invoices until you hit the free plan's limit (3 active by default,
`FREE_INVOICE_LIMIT` in `lib/plan.ts`) — you'll see the upgrade prompt in place of the "add
invoice" form. Use Stripe test card `4242 4242 4242 4242`, any future date/CVC, to complete
checkout and confirm the webhook flips you to Pro.

## 8. Deploy

1. Push this repo to GitHub, import it into Vercel, select the **Pro** plan.
2. Add every variable from `.env.example` to the Vercel project's environment variables, using
   your real (non-test) Stripe keys and Resend key for Production.
3. Set `NEXT_PUBLIC_APP_URL` to your real domain.
4. `vercel.json` already defines the daily cron (`/api/cron/send-reminders` at 07:00 UTC) —
   Vercel picks it up automatically on deploy as long as `CRON_SECRET` is set.
5. Point `chasry.com` (or a subdomain like `app.chasry.com`) at the Vercel project.
6. Add a **second** Stripe webhook endpoint for your production URL (keep the test-mode one for
   local dev), and switch `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` to live-mode values once you're
   ready to charge real cards.
7. Do one real end-to-end pass in production: sign up, add a client with an email you control,
   add an invoice due today, confirm the cron sends, then upgrade with a real card and confirm
   the webhook flips your account to Pro.

## Project structure

```
app/(auth)/          login, signup, password reset — unauthenticated
app/(onboarding)/    business details (no card — lands on the free plan)
app/(dashboard)/     dashboard, invoices, customers, settings — behind auth
app/api/stripe/      Stripe webhook
app/api/cron/        the daily reminder job
components/ui/       shadcn/ui primitives
components/dashboard/ app-specific components (nav, tables, forms, empty states)
emails/              React Email templates for reminders
lib/                 Supabase clients, Stripe, Resend, validation, formatting
supabase/migrations/ database schema (SQL)
types/database.types.ts  hand-written Supabase types — regenerate with the Supabase CLI
                         once you have a project: see the comment at the top of the file
```

## Known limitations (documented, not blocking a first launch)

- The reminder cron compares dates in UTC, not each user's own timezone — a reminder scheduled
  for "7 days before due" can land a few hours off from local midnight. Fine for a first release;
  worth revisiting if users complain.
- One plan, one currency selection per account (doesn't stop you invoicing in a different
  currency per invoice, but reporting doesn't total across currencies).
