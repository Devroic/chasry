# Stripe Playbook: Managing Chasry Subscribers

Manual steps for handling billing requests from **Chasry's own subscribers** (the freelancers
paying €10/month for Pro) directly in the Stripe Dashboard. This is unrelated to the payment
links a subscriber's own clients use to pay their invoices, that's a separate, bring-your-own-link
system (Stripe Payment Link, PayPal.me, etc.) that never touches this Stripe account. Everything
below is about `acct_1U7jIgRtidinAV69` (Cyprus, EUR), the account behind Chasry Pro billing.

## Before you touch anything

**Test mode vs Live mode.** The toggle is top-right in the Stripe Dashboard. Customers, coupons,
subscriptions, and balances do not cross this boundary at all, an action in test mode has zero
effect on a real customer, and vice versa. Always check which mode you're in before acting on a
real subscriber. Real customers only exist in Live mode.

**Whether the change will actually reach the app.** The app finds out about anything you do in
Stripe through a webhook, not by polling. Two different situations:

- **Local dev (test mode)**: the Stripe CLI must be running (`stripe listen --forward-to
  localhost:3000/api/stripe/webhook`, binary at `C:\Users\andre\.local\bin\stripe.exe`). If that
  process isn't running, nothing you do in the test Dashboard reaches your local database, at all,
  not even after a page refresh.
- **Production (live mode)**: as of this writing, **no live webhook endpoint exists yet**, it's
  blocked on the app actually being deployed (see "Production deploy checklist" in
  `ARCHITECTURE.md`). Until that's set up, a real subscriber's Stripe changes will silently **not**
  reach the app at all. If you need to act on a real subscriber before then, you'll have to also
  hand-edit their row in Supabase's `profiles` table to match (see "Always verify" at the end).

**How to verify a change actually landed.** After any action below, check Supabase Table Editor →
`profiles` table → filter by the subscriber's email. Confirm `subscription_status`,
`stripe_customer_id`, `stripe_subscription_id`, and `current_period_end` look right. There's no
admin screen in the app for this yet, Table Editor is the only way to check or fix it by hand.

---

## Cancel a subscription

Most cancellations should be self-service: the Customer Portal (Settings → Billing → "Manage
billing" in the app) already lets a subscriber cancel themselves, **at period end**, and collects
a cancellation reason. Only do this manually if they've asked you to do it for them.

1. Dashboard → **Customers** → find the subscriber (search by email).
2. Open their **Subscriptions** section → click the active subscription.
3. **"..."** menu → **Cancel subscription**.
4. Choose:
   - **Cancel at period end** (usual choice, matches what the Portal itself does): they keep Pro
     until the period they already paid for runs out, then drop to Free.
   - **Cancel immediately**: drops them to Free right away. Stripe will *not* automatically refund
     the unused portion, if that's warranted, issue a refund separately (see below).
5. The webhook flips `profiles.subscription_status` to `canceled` when the subscription actually
   ends (immediately, or at period end). This never locks them out of the app, it just drops them
   back to the free plan's invoice limit (`FREE_INVOICE_LIMIT`, currently 3 active invoices).

## Pause a subscription

**Important:** Stripe's pause feature stops *billing*, it does not touch `subscription.status`
(it stays `active`), so **the app keeps treating them as Pro the entire time they're paused**.
There's no separate "paused" state in `subscription_status`, only `none | active | past_due |
canceled`. If a subscriber wants a genuine break where they lose Pro access, cancel instead
(they can always resubscribe later); use pause only when the intent is "stop charging me but
keep my account exactly as-is."

1. Dashboard → **Customers** → subscriber → **Subscriptions** → open the subscription.
2. **"..."** menu → **Pause payments**.
3. Choose a behavior:
   - **Keep as draft**: invoices still generate but aren't finalized/charged, resumed later.
   - **Mark uncollectible** / **Void**: invoices during the pause are written off entirely.
4. To resume: same menu → **Resume subscription**.

## Extend a subscription (give free time)

Two mechanisms exist in Stripe, and they behave differently. **Prefer the balance credit** unless
you specifically need a fixed, self-expiring discount period.

### Option A: Customer balance credit (recommended, predictable)

A flat credit that Stripe automatically consumes against whatever invoice comes due next, however
many invoices out that is. This is what actually worked correctly when stacking "one more month"
on top of an existing coupon in this account.

1. Dashboard → **Customers** → subscriber.
2. Find **Balance** (near the top of the customer page) → **Add credit** (or "Edit balance").
3. Enter the credit as a **negative** amount, one month = `-€10.00`, two months = `-€20.00`, etc.
   (Stripe stores credit as negative; the Dashboard field usually asks for the credit amount
   directly and applies the sign for you, double-check the resulting balance shows negative.)
4. Save. Nothing else to do, the app's Settings → Billing page computes the real next-payment date
   live from Stripe on every load (`getNextRealPaymentDate()` in `lib/billing.ts`), it will pick
   this up automatically the next time the subscriber (or you) loads that page.

### Option B: Coupon / Promotion Code (fixed duration, self-expiring)

1. Dashboard → **Product catalog** → **Coupons** → **New**.
2. Set **Percent off: 100%**, **Duration: Repeating**, and the number of months.
3. Dashboard → **Customers** → subscriber → **Subscriptions** → open subscription → **"..."** →
   **Update subscription** (or "Add discount", wording varies by Stripe Dashboard version) →
   attach the coupon.

**Pitfall, already hit in this account:** applying a *second* coupon to the same subscription
does **not** add its duration on top of the first one (a 3-month coupon plus a 1-month coupon is
not "4 months free"). Only one discount effectively governs how many invoices are covered. If a
subscriber already has a coupon running and needs *more* free time on top of it, use the balance
credit (Option A) instead, that's the mechanism that reliably stacks.

## Gift a subscription (someone who's never paid)

**Policy:** always gift via promo code, have them redeem it themselves. Never create a
subscription for someone directly in Stripe's Dashboard.

1. Create a Coupon as in Option B above (100% off, `forever` duration for a permanent gift, or
   `repeating` for N free months), then a **Promotion Code** from it (Coupons → the coupon →
   **Create promotion code**) so it has a short, shareable code.
2. Give the subscriber the code and have them click "Upgrade to Pro" in the app themselves and
   enter it at Stripe Checkout (`allow_promotion_codes: true` is already set on the Checkout
   Session, so the field is there).

## Refunds

Refunding money and canceling access are two separate actions, doing one does not do the other.

1. Dashboard → **Payments** → find the charge (search by customer email or amount).
2. Open it → **Refund** → full or partial amount.
3. If the refund should also mean they lose Pro (e.g. refunding because they want out entirely),
   separately cancel the subscription (see above), Stripe does not infer this from a refund.

## Other things worth knowing

- **Card / payment method updates**: fully self-service via the Customer Portal, never needs your
  intervention. Point subscribers to Settings → Billing → "Manage billing" in the app.
- **Invoice history / receipts**: also self-service via the Portal. You can see the same history
  under Dashboard → Customers → subscriber → **Invoices** tab if they ask you to look something up.
- **Failed payments (`past_due`)**: Stripe's Smart Retries automatically retry a failed card over
  several days. The app treats `past_due` as still-Pro (`isPro()` in `lib/plan.ts` includes it as
  a grace period, not a cutoff), so nothing needs doing unless the subscriber needs to be nudged
  to update their card (send them to the Portal). If retries exhaust and Stripe marks the
  subscription `unpaid` rather than fully canceling it, the app's webhook maps that to `none`
  (Free) rather than `canceled`, functionally the same (they lose Pro), just a different label if
  you're reading `subscription_status` directly in Supabase.
- **Billing email changes**: if a subscriber asks you to update the email Stripe sends receipts
  to, that's the Stripe Customer's own email field (Dashboard → Customer → edit), it's separate
  from their Chasry login email and the app never syncs the two automatically.
- **Changing the price itself**: don't edit the existing live Price object, `tax_behavior` is
  immutable once set and this price already has real subscribers on it. Create a new Price on the
  same Product and migrate subscribers deliberately if the €10/month figure ever needs to change,
  see the "Stripe account configuration" section of `ARCHITECTURE.md`.
