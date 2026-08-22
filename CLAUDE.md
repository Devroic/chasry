@AGENTS.md
@PROJECT.md
@ARCHITECTURE.md

## Working on this repo

- `README.md` has setup/deploy steps (accounts, env vars, migration) — don't duplicate that here.
- Don't reintroduce `react-hook-form`, a `Calendar`/`Popover` date picker, or Sentry config
  without a reason — all three were deliberately left out or removed (see `ARCHITECTURE.md`).
- If `npx shadcn add <component>` ever gets run again, check `components.json` still says
  `"style": "radix-nova"` afterwards — the CLI's default has switched away from Radix before.
- No git repo yet as of this writing — `/security-review` and similar tooling need one. Ask
  before running `git init`/committing; it hasn't been requested yet.
