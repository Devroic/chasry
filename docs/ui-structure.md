# UI structure

Read this before changing dashboard chrome, headers/footers, route-group layout, the landing
page, or legal pages.

Route groups: `(auth)` — unauthenticated · `(onboarding)` — post-signup, pre-onboarding ·
`(dashboard)` — everything behind `requireOnboardedUser()`, with `DashboardShell` providing the
chrome and a small Free/Pro badge next to the account name (not a persistent banner, the
free-tier nudge only shows contextually as `UpgradePrompt` at the paywall moment).

**Dashboard shell is a full-width header on top, with a left sidebar below it.** A sticky
`<header>` spans the full viewport width (no `max-w-*`/`mx-auto` wrapper, that centering caused
the logo to render off-center on wide monitors), logo at the true left edge (`h-10 sm:h-14`),
"Upgrade to Pro" + account dropdown at the right. Below it, a `hidden lg:flex` left `<aside>`
with `DashboardNav` next to `<main>`. On mobile the sidebar becomes a `Sheet`-based hamburger
menu reusing the same `DashboardNav`. `nav-items.ts`'s order is Dashboard → **Clients →
Invoices**, deliberately, since an invoice needs a client to exist first.

**Settings lives only in the account menu (`UserMenu`), not the sidebar** — Settings/Billing/
Reminders are occasional account-level configuration, not daily-use like the three sidebar items,
matching the common SaaS pattern of keeping account-scoped settings behind the avatar. `UserMenu`
carries Settings (→ `/settings/profile`) and Log out only. Keep Settings in exactly one place,
don't add it back to `nav-items.ts` without removing it from `UserMenu`.

Detail/edit/new pages under `(dashboard)` use `components/dashboard/back-link.tsx` consistently
(customer detail → Clients, customer edit → that customer's detail page, invoice detail →
Invoices, invoice edit → that invoice's detail page, "new" pages → their list, or for
`invoices/new?customer_id=` back to that specific client). Add a `BackLink` to any new page
that isn't already reachable from a nav item.

The four "new"/"edit" pages (customer/invoice) use `components/dashboard/form-tips.tsx`, a small
tinted card of 2-3 contextual tips in a `lg:grid-cols-3` grid next to the form (form spans 2
columns, tips take the third) inside a `max-w-4xl` wrapper. Keep tips short and specific to that
page's action.

`(auth)`, `(onboarding)`, and `app/not-found.tsx` share `<SiteHeader>`, a slim sticky header with
just the logo lockup, plus a `bg-gradient-to-br from-white via-white to-brand-secondary-tint/40`
background and a centered white card. This mirrors chasry.com's actual layout (a small header
logo, not a half-viewport side panel), confirmed by screenshotting the live site rather than
guessing. **Logo size is pixel-matched to chasry.com**: its header is 85px tall with a 56px logo;
`SiteHeader` and `DashboardShell` both use `h-20` (80px) with the logo at `h-10 sm:h-14` (56px on
sm+). If a future request says the logo looks wrong size, **measure chasry.com's current header
first** rather than guessing a new value. `DashboardShell` uses the same `/40` gradient opacity
as `SiteHeader` so the background reads identically before and after login.

All route groups (`(auth)`, `(onboarding)`, `not-found.tsx`, `(dashboard)`) share `<SiteFooter>`:
copyright, a "Help" link, a "Contact us" mailto link, Instagram/Facebook/TikTok icon links
(`components/icons/social-icons.tsx`, hand-drawn inline SVGs since lucide-react ships no brand
logos). Wired in via the standard sticky-footer flexbox pattern; in `DashboardShell` the footer
sits below the full header+sidebar/main row, spanning the full width undivided by the sidebar.

`/help`, `/terms`, and `/privacy` are **public, un-gated pages**, root-level, each composing its
own chrome. All three render in two different chromes depending on auth state: a signed-in
visitor with a finished account (`profile.onboarded_at` set) gets the full `DashboardShell`; a
signed-out or half-onboarded visitor gets the slim `<SiteHeader>` (a half-onboarded user with the
full shell would get nav links that bounce them straight back to `/onboarding`). Any future page
reachable in both states should follow this shape.

None of the three use `BackLink` on their signed-out chrome, `SiteHeader`'s logo already links to
`/`, a `BackLink` to the same place would be redundant. `BackLink` is still correct on the four
dashboard detail/new pages, since those point at a specific list, not `/`.

Detail-page info grids use small `lucide-react` icons per field (invoice: Wallet/CalendarClock/
User/Link2/StickyNote; customer: Phone/Link2/Bell/StickyNote), one icon per field label, not
decorative elsewhere.

Both `(auth)` and `(dashboard)` route groups have a `loading.tsx` (`Loader2` spinner,
brand-primary color) so route transitions show immediate feedback via Suspense.

**Typography**: **Inter** (`next/font/google`, `--font-inter`), matching chasry.com (confirmed
via computed styles: `Inter`, headline weight 800). Marketing-adjacent pages (auth, onboarding,
not-found) use `font-extrabold` headings; in-app dashboard headings stay `font-semibold`
(functional UI vs. a marketing moment, deliberate). `globals.css`'s `--font-sans` must point at
`--font-inter` explicitly, not be self-referential.

Brand tokens live in `app/globals.css` as CSS variables (`--brand-primary`, etc.), see
`PROJECT.md` for hex values, also check `brand/palette/tokens.css`/`colors.md` before changing
any brand color. `--radius` is `0.875rem` (rounder than the shadcn default, to match the landing
page). `globals.css` respects `prefers-reduced-motion`; `Button` sets `cursor-pointer` explicitly.

## Public landing page (`app/page.tsx`) and legal pages

`/` is a real page for a logged-out visitor (a logged-in one still redirects to `/dashboard`):
hero with both CTAs, three feature cards, a three-step "how it works" section, and a pricing
teaser reading `FREE_INVOICE_LIMIT`/`PRO_PRICE_LABEL` from `lib/plan.ts` rather than hardcoding
numbers that could drift. All copy is grounded in facts already established elsewhere in the app.
Not a clone of chasry.com's own marketing site (out of scope per `PROJECT.md`), a lighter page
whose only job is explaining the product before a signup.

`SiteHeader` has an optional `actions` prop (`React.ReactNode`, appended after the theme/language
controls) so this page could add a "Log in" link without changing the header's default behavior
elsewhere.

`/terms` and `/privacy` use the same `SiteHeader`/`SiteFooter`/`BackLink` shell as `/help`'s
logged-out chrome, grounded in what the app's stack actually does (subprocessors listed are
literally Supabase, Stripe, Resend, Sentry, Vercel). Neither names a registered legal entity or
address; the governing-law clause names Cyprus only because that's the Stripe account's country.
**Both need a real legal review before being relied on**, especially the GDPR sections, since
Chasry processes personal data about a third party (the account holder's own client) who never
interacts with Chasry directly.

## `not-found.tsx`

Root-level only (`app/not-found.tsx`), a `notFound()` call from inside `(dashboard)` pages
renders this same page, dropping the dashboard chrome. Uses the same `<SiteHeader>` + gradient +
centered layout as auth/onboarding. The mascot image needs `priority`, without it `next/image`'s
lazy-loading never actually fires the request on this specific Next.js route type. Every other
mascot usage in the app is below the fold or fine to lazy-load, this one isn't.
