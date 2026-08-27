# API surface

Read this before adding or changing a Route Handler or Server Action. See `ARCHITECTURE.md` for
the two cross-cutting security rules (every action authenticates itself; timing-safe secret
comparison).

**Route Handlers** (only because an external system calls in, not our own UI):
- `POST /api/stripe/webhook` — handles `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted` (`invoice.payment_failed` intentionally not handled separately,
  `.updated` already reflects `past_due`). Verifies the Stripe signature. An
  unrecognized/incomplete Stripe status maps to `'none'` (free), never silently to Pro, see
  `mapStripeStatus()`.
- `GET /api/cron/send-reminders` — Vercel Cron only, requires
  `Authorization: Bearer $CRON_SECRET`, checked with `crypto.timingSafeEqual` (not `===`) to
  avoid leaking the secret via response-timing differences. Sends reminders for **every**
  account regardless of plan, the free-plan limit only caps how many active invoices someone can
  have, never whether reminders work on the ones they do.

**Server Actions**, co-located with the pages that use them:
- `app/(dashboard)/customers/actions.ts`, `.../invoices/actions.ts` — CRUD, `markInvoicePaid`,
  `sendPreviewReminder` (emails a sample reminder to the logged-in user only, for QA).
  `createInvoice`/`reopenInvoice` enforce the free-plan limit.
- `app/(dashboard)/settings/{profile,reminders,billing}/actions.ts` — profile updates, reminder
  offset config, `startCheckout`/`openBillingPortal` (both import the shared `requireUser` from
  `lib/auth.ts`, don't reintroduce a local copy).
- `app/(onboarding)/onboarding/actions.ts` — saves profile only, no Stripe call.
- `app/(auth)/actions.ts`'s `signup()` passes `emailRedirectTo: ${appUrl}/signup/confirmed`, and
  that page checks `supabase.auth.getSession()` on mount to show a definitive confirmed/expired
  result (Supabase's confirmation redirect carries the new session in the URL hash, auto-consumed
  by the browser client). **Gotcha**: `signUp()` does *not* return an error for an email that's
  already registered and confirmed, Supabase's anti-enumeration default returns a normal
  success-shaped response instead, signaled only via `data.user.identities` being an empty array.
  `signup()` must check that explicitly. When `signUp()` *does* return an error, branch on
  `error.code` (typed `ErrorCode` in `@supabase/auth-js`), not on `error.message` substrings,
  message text isn't a stable contract.
  **Supabase Auth's own emails go through custom SMTP (Resend), not the shared default mailer**
  (which caps at ~2 emails/hour, testing-only). `chasry.com` is verified as a sending domain in
  Resend; Supabase's Authentication → Emails → SMTP Settings points at `smtp.resend.com:465`
  with the same `RESEND_API_KEY`, sending as `Chasry <noreply@chasry.com>`. This is a *separate*
  Resend API key/purpose from `lib/resend.ts`'s reminder sending, **but the same underlying
  Resend account and quota**: Resend's free tier is 3,000 emails/month **and 100/day**. Keep
  Supabase's Auth → Rate Limits "emails/h" value well below the daily cap (~20–30/h) so an auth
  burst can't exhaust the day's quota and starve the reminder cron, the core product function.
- `lib/billing.ts` — shared `createCheckoutSession()` helper used by both the paywall prompt and
  the billing settings page.
- Account deletion (`settings/profile/actions.ts`) cancels the Stripe subscription first, not
  just a DB delete, so a deleted account can't keep getting charged.

Every exported Server Action authenticates itself internally rather than relying on the page or
layout that renders its form, Server Actions are callable directly. Keep doing this for new
actions.
