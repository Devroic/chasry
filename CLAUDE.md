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
- Don't reintroduce `react-hook-form`, a `Calendar`/`Popover` date picker, or Sentry config
  without a reason — all three were deliberately left out or removed (see `ARCHITECTURE.md`).
- If `npx shadcn add <component>` ever gets run again, check `components.json` still says
  `"style": "radix-nova"` afterwards — the CLI's default has switched away from Radix before.
- Don't reintroduce a card-required trial or a `'trialing'`/`'incomplete'` subscription status —
  the pricing model is free-tier + Pro now (see `PROJECT.md`), not trial-then-subscribe.
- This is a git repo (initialized for the manual security pass). No remote is configured yet —
  ask before adding one or pushing; that hasn't been requested. Uncommitted changes may exist —
  check `git status` before assuming the working tree matches the last commit.
