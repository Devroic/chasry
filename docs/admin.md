# Internal admin section (`/admin`)

Read this before touching any `/admin` page or `app/admin/actions.ts`.

A single-operator internal tool, not part of the product a subscriber ever sees. Uses a separate
`AdminShell` (`components/admin/`, no collapsible sidebar toggle, a horizontal nav row below `lg`
instead of a `Sheet` hamburger) but shares the header + left-sidebar shape of the main dashboard.
Wired into `next-intl` normally. Admin copy lives under the `admin` namespace in
`messages/*.json`; `lib/validations/admin.ts` follows the same Translator-factory pattern as
every other form's schema.

- **Auth gate**: `requireAdmin()` in `lib/auth.ts` — `requireUser()` first, then checks the
  session's email against `ADMIN_EMAILS` (comma-separated env var) via `isAdminEmail()`. A
  logged-in non-admin gets a plain `notFound()` (404), not a redirect. Every `/admin` page and
  the one Server Action call this themselves, don't rely on a layout-level check alone.
- **Data access**: admin pages use `createAdminClient()` (service-role, bypasses RLS) after
  `requireAdmin()` has verified the caller. Don't add a third consumer of that client without the
  same admin gate in front of it.
- **Pages**: `/admin` (overview metrics + lifetime revenue via `getLifetimeRevenueCents()` in
  `lib/billing.ts`, which sums Stripe's `balanceTransactions`), `/admin/users` (URL-param
  search/sort/`ClickableTableRow`, same pattern as the customers/invoices lists),
  `/admin/users/[id]` (deep link to the real Stripe Dashboard for that customer, mutations happen
  there), `/admin/playbook` (in-app copy of `STRIPE-PLAYBOOK.md`).
- **Admin accounts are excluded from every metric and the user list** (`isAdminEmail()` filter),
  since they aren't real subscribers and their `subscription_status` is a simulated view (below).
- **An admin's own account renders as Pro by default**, with a Free/Pro toggle in `AdminShell`'s
  header (cookie `ADMIN_PLAN_OVERRIDE_COOKIE`, read by `getAdminPlanOverride()`, applied inside
  `getProfile()`), **never written to the database**. `createInvoice`/`reopenInvoice` read
  `getProfile()` (not an ad hoc query) specifically so the simulated plan is enforced
  server-side, not just cosmetically. Trade-off: an admin with a genuine Stripe subscription
  won't see its real status while the override is active.
- **The one mutating action**: `linkStripeCustomer` in `app/admin/actions.ts` sets
  `profiles.stripe_customer_id` directly, needed because the Stripe webhook only matches an
  incoming event to a Chasry account via that column, which is otherwise only ever written
  through the app's own Checkout flow. Gifting a subscription means linking this by hand *before*
  creating the subscription in Stripe, see `STRIPE-PLAYBOOK.md`. The action re-checks
  `.is("stripe_customer_id", null)` server-side (not just hiding the form in the UI), don't
  remove that check, it prevents a resubmit from silently overwriting an existing correct link.
- **Not exposed in primary nav** — `DashboardShell` takes an optional `isAdmin` prop, threaded to
  `UserMenu` to conditionally show an "Admin" entry, invisible to everyone else.
