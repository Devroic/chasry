# Database schema (Postgres via `supabase/migrations/`)

Read this before writing a migration or a new query against a table not listed here. See
`ARCHITECTURE.md`'s "Database" section for the migration workflow rule (CLI only).

- `profiles` — 1:1 with `auth.users`, auto-created by the `handle_new_user` trigger, which also
  copies `business_name` from signup metadata. **Keep that in the trigger, not app code** — a
  `.update()` right after `signUp()` silently no-ops whenever email confirmation is required,
  since there's no session yet for the RLS-scoped client to write with. The security-definer
  trigger writes it atomically with the row, before RLS is ever in play.
  `subscription_status` defaults to `'none'` and is one of
  `'none' | 'active' | 'past_due' | 'canceled'` — no `'trialing'`/`'incomplete'` value and no
  `trial_ends_at` column; don't reintroduce them without reintroducing the trial concept they
  supported (pricing is free-tier + Pro now, not trial-then-subscribe).
- `customers` — the debtor an invoice is owed by. Called "Clients" in the UI; named `customers`
  in the schema to avoid confusion with Chasry's own subscribers (`profiles`).
  `unique (user_id, email)` constraint, with friendly-error handling
  (`isDuplicateEmailError()` in `customers/actions.ts`, Postgres code `23505`). Override columns:
  `payment_link`, `reminder_offsets`, `reminder_enabled`.
- `invoices` — `status` is `unpaid | paid | canceled`. "Overdue" is a *derived* display state
  (`invoiceDisplayStatus()` in `invoice-status-badge.tsx`), never a stored status, don't add an
  `overdue` enum value. Override columns: `reminder_offsets`, `reminder_enabled`.
  `invoices.payment_link` exists but is inert, unread/unwritten by the app (see
  `docs/reminder-engine.md`), left in place rather than dropped so existing values aren't lost.
  No `issued_date` column, don't re-add without a reason (it was never read by the reminder
  engine, which is driven entirely by `due_date`).
- `reminder_settings` — one row per user, `offsets int[]` (negative = days before due, positive
  = after), default `{-7,-3,1}`.
- `reminder_logs` — `unique(invoice_id, offset_days)` is the idempotency guard against the daily
  cron double-sending if invoked twice for the same milestone.
- RLS on every table, `using (user_id = auth.uid())`. `invoices`/`reminder_logs` carry `user_id`
  directly (denormalized) so policies don't need joins.
- `types/database.types.ts` is **hand-written**, not generated — keep in sync with the SQL by
  hand, or regenerate with the Supabase CLI (command in the file's header comment).
- No `profiles.timezone` column — don't re-add without also deciding what reads it (the reminder
  cron is UTC-only regardless) and adding a migration.

## Migration workflow detail

**Migrations are never executed by the app** — not on boot, not on request. This deploys to
Vercel as serverless functions, so "run migrations at startup" would mean every cold start racing
every other instance to run DDL. Schema changes belong to the *deploy* step, not runtime.

**Apply with the Supabase CLI, never by pasting into the dashboard SQL editor.** The project is
CLI-linked (`supabase/config.toml` + gitignored `supabase/.temp/`):

```
npm run db:status   # supabase migration list — local vs remote, side by side
npm run db:push     # applies anything pending, records it in the ledger
npm run db:diff     # schema drift between local migrations and the live DB
```

`db:push` writes each applied version to Supabase's ledger and refuses to re-run what's already
there. Add `--dry-run` first on anything destructive. If a project is ever restored from a
backup or repointed at a fresh instance, the ledger may need `supabase migration repair --linked
--status applied <versions>` before the first push, otherwise `db:push` will try to re-run
non-idempotent DDL (`create table`, `add constraint`) against live tables.

**`supabase/config.toml` configures the *local* dev stack only** (`supabase start`, Postgres in
Docker), not the hosted project — remote auth/SMTP settings live in the Supabase dashboard.
