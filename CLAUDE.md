@AGENTS.md

# Chasry

Web app: freelancers log unpaid invoices, Chasry auto-chases payment by email until paid, funded
by free tier (3 active invoices) + €10/mo Pro. Next.js 16 (App Router, Server Actions) +
Supabase (Postgres/Auth/RLS) + Stripe Billing + Resend + Vercel (hosting + daily cron).
`README.md` has setup/deploy steps, don't duplicate them here.

Deeper reference (full schema, Stripe account config, admin section, reminder-engine algorithm,
pixel-level UI structure, Sentry, theme, i18n, forms, list pages) lives in `ARCHITECTURE.md` and
`docs/*.md`, not loaded automatically. Read the relevant one only if a task needs that depth,
most fixes don't.

## Skills to use on this repo, proactively

These aren't optional extras — use them without waiting to be asked, before the work they cover
is considered done:

- **Before any UI/UX work** (new pages, components, pricing/paywall surfaces, copy for
  empty/error/upgrade states): run `ui-ux-pro-max` and, for anything with real visual/brand
  weight, `frontend-design`. Apply findings, don't just read them.
- **Before styling anything compared to chasry.com**: actually load the live site and look at it
  (screenshot + computed styles), don't design from memory of the brand palette. The site uses a
  slim header with a small logo (not a half-viewport panel) and Inter at weight 800 for
  headlines.
- **Before finishing any change touching auth, billing, RLS, webhooks, or Server Actions**: run
  `/security-review` (needs a GitHub `origin/HEAD` remote, this repo has one). If it can't run,
  do the manual equivalent (RLS coverage, admin-client isolation, webhook signature checks, IDOR
  via `user_id` scoping, timing-safe secret comparison, no `dangerouslySetInnerHTML`) and say
  explicitly it was manual.
- **Before finishing any change to a Server Component page, Server Action, or data-fetching
  logic**: check `vercel-react-best-practices` (`server-cache-react`, `async-parallel`,
  `server-auth-actions`). A page that fetches `profiles` itself instead of
  `requireOnboardedUser()`'s cached version is a real regression class here.
- **Before starting a genuinely new feature** (not a small fix): `brainstorming` first.

## Hard rules

Things that already broke silently once in this app, don't reintroduce them:

- This installed `radix-ui` version's `Select`/`Switch` post nothing to native `FormData` (no
  hidden bubble input). Every form in the app is already on `react-hook-form` + `zodResolver`
  (unaffected, reads its own state). Any *new* form must use the same pattern, not plain
  `FormData` with `Select`/`Switch` in it, or the field silently submits nothing.
- Every form: `react-hook-form` + `zodResolver` directly in the component, `mode: "onSubmit"`,
  `<FormField>`, `<PasswordInput>` for password fields. Calling the `useActionState` dispatcher
  from `onValid` must be wrapped in `startTransition(...)` or React throws.
- Every optional-string Zod field must transform blank input to `null`, never `undefined` — see
  `optionalText()`/`optionalUrl` in `lib/validations/shared.ts`. `toFormData()`
  (`lib/utils.ts`) drops `undefined` keys entirely, silently breaking "clear this field" on
  update.
- Every Server Action authenticates itself internally (`requireUser()`/`requireOnboardedUser()`),
  never rely on a page/layout guard alone, Server Actions are callable directly.
- `signUp()` returns no `error` for an already-registered, confirmed email — check
  `data.user.identities?.length === 0` explicitly.
- Any secret comparison (cron auth, etc.) uses `crypto.timingSafeEqual`, not `===`.
- `lib/supabase/admin.ts` bypasses RLS. Only the cron route, the Stripe webhook, and the admin
  section import it, never anywhere a request is on behalf of a specific browser user.
- List pages use `ClickableTableRow` so the whole row navigates, not per-cell `<Link>`. Detail/
  edit/new dashboard pages use `BackLink` consistently.
- Don't reintroduce a card-required trial, a `'trialing'`/`'incomplete'` subscription status, or
  the dropped `profiles.timezone`/`invoices.issued_date` columns, all deliberately removed.
- Migrations: `npm run db:push`, never paste SQL into the Supabase dashboard SQL editor.
- If `npx shadcn add <component>` runs, check `components.json` still says
  `"style": "radix-nova"` afterwards, the CLI's default has switched away from Radix before.
- No dashes as sentence punctuation in user-facing copy (commas, colons, or two sentences
  instead). The `"—"` glyph for an empty table cell (`{customer.phone || "—"}`) is the one
  deliberate exception.
- Never write `.env.local` with PowerShell's `Set-Content`/`Out-File -Encoding utf8`, it adds a
  UTF-8 BOM that silently breaks the first env var's name. Use
  `[IO.File]::WriteAllText($p, $text, (New-Object System.Text.UTF8Encoding($false)))` or the Edit
  tool. `.env.local` already has real (non-placeholder) Supabase credentials, don't overwrite
  with placeholders.
- A blank dashboard in the in-app Browser pane usually isn't a bug, `(dashboard)/loading.tsx`
  renders as a permanent spinner whenever the pane isn't displayed. Check
  `document.getElementById('S:0').textContent` before debugging.
- Git remote is `origin` → `github.com/Devroic/chasry-webapp` (private). Don't push without being
  asked, commits happen locally by default.

## Not yet done (see `ARCHITECTURE.md` for full detail)

- Production Stripe webhook endpoint doesn't exist yet, blocks real payments from ever granting
  Pro.
- Sentry alert rule isn't scoped to `production` yet (can't be, until the first prod deploy).
- Upstash rate limiting is wired but inert (no env vars set).
- No automated tests.
- `/signup` may not hydrate on a fresh/hard page load, not yet root-caused.
