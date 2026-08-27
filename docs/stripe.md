# Stripe account configuration

Read this before touching Stripe/billing setup, the webhook endpoint, or the checkout/portal flow.

Account `acct_1U7jIgRtidinAV69`, Cyprus, EUR.

- **Product/price**: `prod_V800ZHLx25qaAU` ("Chasry Pro"), €10.00/month. **Live price:
  `price_1U7k0RRtidinAV69745bycOw`** — this is what `STRIPE_PRICE_ID` must be in Vercel;
  `.env.local` deliberately holds the *test* price instead. Products/prices don't cross the
  test/live boundary, so a live-only product means nothing works locally without a matching test
  one.
- **VAT is inclusive** (`tax_behavior: "inclusive"`). Exclusive would add VAT *on top*, breaking
  every "€10/month" string the moment Stripe Tax is switched on, inclusive keeps the customer at
  exactly €10 forever. Stripe Tax is not activated yet, so no VAT is calculated today either way.
  `tax_behavior` is immutable once set, changing it later means a new price and archiving the old.
- **Customer portal** is configured in both test and live: invoice history, payment-method and
  customer detail updates, cancel **at period end** (matches `mapStripeStatus`, the user keeps
  Pro until the paid period runs out), cancellation reason collected, subscription updates
  disabled (only one plan exists).
- Customer receipt emails ("Successful payments", "Refunds") are enabled under Settings →
  Business → Customer emails.
- Payouts: automatic weekly on Monday. Radar: Lite (free). Statement descriptor `CHASRY.COM`,
  shortened `CHASRY`.
- **Not done, blocked on deployment**: the production webhook endpoint, see the "Production
  deploy checklist" in `ARCHITECTURE.md`. It produces the real `STRIPE_WEBHOOK_SECRET` for
  production, which is a **separate value** from local dev's, they are not interchangeable.
- **Local dev has a real webhook**, not a simulated one, via the Stripe CLI (installed at
  `C:\Users\andre\.local\bin\stripe.exe`, not on `PATH`, a personal machine tool, not a project
  dependency). `stripe listen --forward-to localhost:3000/api/stripe/webhook` (see `README.md`
  for full local-dev setup) tunnels real Stripe test-mode events to the local dev server.
  `.env.local`'s `STRIPE_WEBHOOK_SECRET` must be the real secret the CLI reports on startup
  (`stripe listen --print-secret`), not a made-up value. **The CLI must actually be running** as
  a separate long-lived process from `next dev`, it dies when its terminal closes and doesn't
  restart itself after a machine reboot.
