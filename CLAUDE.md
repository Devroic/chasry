@AGENTS.md
@PROJECT.md
@ARCHITECTURE.md

## Skills to use on this repo, proactively

These aren't optional extras — use them without waiting to be asked, before the work they cover
is considered done:

- **Before any UI/UX work** (new pages, components, pricing/paywall surfaces, copy for
  empty/error/upgrade states): run `ui-ux-pro-max` (search its guidelines for the specific
  concern — pricing pages, forms, touch targets, etc.) and, for anything with real visual/brand
  weight, `frontend-design`. Apply findings, don't just read them — e.g. this repo's `Button`
  didn't have `cursor-pointer` and `globals.css` didn't respect `prefers-reduced-motion` until a
  `ui-ux-pro-max` pass caught both; that pass also produced `lib/plan.ts` and `UpgradePrompt`.
- **Before styling anything the user compares to chasry.com**: actually load the live site and
  look at it (screenshot + computed styles — font-family, weight, colors), don't design from
  memory of the brand palette alone. The first pass at the auth pages (a 50/50 split-screen with
  a giant logo/mascot panel) was built without doing this and had to be thrown out and rebuilt
  once the user pointed out it didn't match the real landing page at all. The actual site uses a
  slim header with a small logo (not a half-viewport panel) and Inter at weight 800 for
  headlines — see "UI structure" in `ARCHITECTURE.md` for what was actually found.
- **Before finishing any change that touches auth, billing, RLS, webhooks, or Server Actions**:
  run `/security-review`. As of this writing it needs a GitHub `origin/HEAD` remote to diff
  against — this repo is local-only, so it currently fails with `fatal: ambiguous argument
  'origin/HEAD...'`. Check `git remote -v` first; if a remote exists, use the real skill instead
  of a manual pass. If it still doesn't work, do the manual equivalent (RLS coverage, admin-client
  isolation, webhook signature checks, IDOR via `user_id` scoping, timing-safe secret comparison,
  no `dangerouslySetInnerHTML`) and say explicitly that it was manual, not the automated tool.
- **Before finishing any change to a Server Component page, Server Action, or data-fetching
  logic**: check the relevant `vercel-react-best-practices` rules (`server-cache-react`,
  `async-parallel`, `server-auth-actions` are the ones that have actually caught real bugs here —
  see `ARCHITECTURE.md`'s "Verification passes run so far"). A new dashboard page that fetches
  `profiles` itself instead of using `requireOnboardedUser()`'s cached version is a regression of
  exactly the bug that pass fixed.
- **Before starting a genuinely new feature** (not a small fix): `brainstorming`, before writing
  code.

Skipping these isn't a shortcut — it's the thing that was skipped once already in this project
and had to be circled back for, which is why this section exists.

## Working on this repo

- `README.md` has setup/deploy steps (accounts, env vars, migration) — don't duplicate that here.
- `react-hook-form` + `zodResolver`, called directly in each form component (not through a shared
  hook — see "Forms & validation" in `ARCHITECTURE.md` for why the wrapper hook was abandoned),
  is the validation pattern for **every** form in the app now — auth, onboarding, and the
  dashboard CRUD forms (customer/invoice/profile/reminder-settings) alike, after the user asked
  for consistent real validation and error handling everywhere. Don't reintroduce native
  `required`/`type="email"` HTML validation, and don't add a new form on plain `FormData` without
  a specific reason — that's exactly the inconsistency that got fixed. Any form on this pattern
  must call the `useActionState` dispatcher inside `startTransition(...)`, not as a bare function
  call — see the "Gotcha" note in ARCHITECTURE.md's "Forms & validation" section. A `Calendar`/
  `Popover` date picker and Sentry config are still deliberately left out.
- Every optional-string Zod field (phone, notes, invoice number, payment link, ...) must
  transform blank input to `null`, never `undefined` — see `optionalText()`/`optionalUrl` in
  `lib/validations/shared.ts`. `undefined` gets dropped by `toFormData()` (`lib/utils.ts`)
  entirely, which silently breaks *clearing* the field on an update.
- The dashboard shell is a full-width header (big flush-left logo, Upgrade/account menu) with a
  left sidebar for nav below it — went through a sidebar → horizontal-top-nav → header+sidebar
  cycle based on user feedback each time. See "UI structure" in `ARCHITECTURE.md` before changing
  this layout again.
- Signup's `signUp()` call must keep checking `data.user.identities?.length === 0` for the
  duplicate-email case — Supabase returns no `error` for that case by design. See "Server
  Actions" in `ARCHITECTURE.md`.
- **This installed `radix-ui` version's `Select`/`Switch` post nothing to native `FormData` on
  their own** — no hidden bubble input, `name` prop does nothing by itself. This broke reminder
  settings, profile currency, and invoice creation for real before being caught. Now that those
  forms are on react-hook-form (`Controller` for `Select`, `watch`/`setValue` for `Switch`), this
  doesn't come up in practice — but if a *new* form is ever added on plain `FormData` (not
  react-hook-form) with a `Select`/`Switch` in it, it needs a controlled `value`/`checked` + a
  hand-written `<input type="hidden">` mirroring it, or it will silently submit nothing for that
  field. See the "Critical gotcha" note under Stack in `ARCHITECTURE.md`.
- List pages (invoices, customers) share a URL-param-driven search/sort/filter pattern and a
  `ClickableTableRow` component so the whole row navigates, not just the linked text — see "List
  pages" in `ARCHITECTURE.md` before touching either table. Don't go back to per-cell `<Link>`
  wrapping; that was the reported "not all the row is clickable" bug.
- Detail/edit/new dashboard pages use `BackLink` consistently, and the four client/invoice
  add-edit pages use `FormTips` to fill the layout instead of leaving empty space — see "UI
  structure" in `ARCHITECTURE.md`. Keep new pages consistent with this rather than one-off.
- Password fields use `<PasswordInput>` (`components/ui/password-input.tsx`), not a bare
  `<Input type="password">` — it adds the show/hide eye toggle. Use it for any new password field.
- `/help` (`app/help/page.tsx`) is a public FAQ page, reachable from `SiteFooter` and the
  dashboard account menu. Update it in place rather than creating a second help/FAQ surface.
- If `npx shadcn add <component>` ever gets run again, check `components.json` still says
  `"style": "radix-nova"` afterwards — the CLI's default has switched away from Radix before.
- Don't reintroduce a card-required trial or a `'trialing'`/`'incomplete'` subscription status —
  the pricing model is free-tier + Pro now (see `PROJECT.md`), not trial-then-subscribe.
- This is a git repo with a remote: `origin` → `github.com/Devroic/chasry-webapp` (**private**,
  owned by the `Devroic` org — moved there from the personal `andreaseracleous99` account, alongside
  `Devroic/chasry`, the landing page). GitHub redirects the old URL, so stale clones still work.
  `origin/HEAD` is set so diff-based tooling (`/security-review`, etc.) works. Don't push without
  being asked — commits happen locally by default; ask before `git push`.
- **No dashes as sentence punctuation in user-facing copy.** `messages/en.json`, `messages/el.json`,
  the `emails/` templates, Zod messages and Server Action error strings use commas, colons, or two
  sentences instead. The whole app was swept once already; don't reintroduce the habit when adding a
  string. The one deliberate exception is the `"—"` glyph standing in for an empty table cell
  (`{customer.phone || "—"}`), which is a "no value" marker rather than punctuation.
- **Never write `.env.local` with PowerShell's `Set-Content`/`Out-File -Encoding utf8`** — on
  Windows PowerShell 5.1 that writes a **UTF-8 BOM**, and the BOM becomes part of the *first*
  variable's name (`﻿NEXT_PUBLIC_SUPABASE_URL`), so that variable silently reads as
  `undefined` while every other line still works. This actually happened while wiring up Stripe
  and it broke Supabase for the whole app. Use `[IO.File]::WriteAllText($p, $text, (New-Object
  System.Text.UTF8Encoding($false)))`, or edit the file with the Edit tool. Check with
  `head -c 3 .env.local | od -An -tx1` — `ef bb bf` means a BOM is there.
- **A blank dashboard in the in-app Browser pane is usually not a bug.** Pages behind
  `(dashboard)/loading.tsx` render as a permanent spinner whenever the pane isn't displayed:
  React reveals suspended content inside `requestAnimationFrame`, and a non-compositing tab never
  fires it. The content is present the whole time — check `document.getElementById('S:0').textContent`
  before debugging the app. Screenshot calls timing out with "the Browser pane is not displayed"
  is the tell.
- `.env.local` has real (non-placeholder) Supabase credentials for local dev as of this writing —
  don't overwrite it with placeholder values when testing; if you need a placeholder env for a
  quick build check, restore the real values afterward rather than leaving it stubbed out.
