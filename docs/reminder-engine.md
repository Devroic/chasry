# Reminder engine

Read this before touching reminder scheduling, the cron job, or payment-link resolution.

**Reminder schedule is a three-level cascade; payment link is a two-level cascade**, deliberately
asymmetric. Reminder schedule: invoice-level override → client-level override → account default
(`reminder_settings`), the full 3 levels, because a single invoice can genuinely need
pausing/softening independent of its client's usual schedule (e.g. a dispute). Payment link:
client-level override → account default (`profiles.payment_link`) only, **no invoice-level
override**, a payment link is a property of *how you get paid*, not tied to one invoice. Don't
reintroduce a payment-link `FormField` on the invoice form without re-deciding this.

All override columns are nullable, `null` means "inherit," a real value (including an empty `[]`
offsets array, a deliberate "no reminders for this one" state) means "override active."
`reminder_offsets`/`reminder_enabled` are always written **together**, never independently, even
though they're independently nullable at the DB level, see `lib/reminder-override.ts`'s
`encodeReminderOverride`/`decodeReminderOverride`. The UI for "use default, or customize just for
this one" (`reminder-override-section.tsx`) is shared between the client and invoice forms;
`reminder-offset-switches.tsx` (the Gentle/Firm switch grid) is shared three ways (global
settings, client override, invoice override). Every place that resolves the effective reminder
schedule uses `invoice ?? customer ?? account`; every place resolving the effective payment link
uses `customer ?? account`, don't resolve either differently at a new call site.
`lib/reminders.ts`'s `describeReminderSchedule(offsets, enabled, t)` renders the resolved
schedule as plain text, taking a next-intl translator so it works from both Server and Client
Components.

`app/api/cron/send-reminders/route.ts`, run daily:

1. Load every profile + `reminder_settings`, **not** filtered to `enabled = true` (an account
   could have the default off but a specific client/invoice overridden back on). Effective
   `enabled` is resolved per invoice instead (`invoice ?? customer ?? default`), and invoices
   where that resolves to `false` are skipped individually.
2. For each unpaid invoice, collect every configured offset whose target date is **today or
   earlier** and not yet logged, "or earlier" makes a missed cron run self-healing rather than a
   permanently lost reminder. Only the **most recent** (max target date) offset is actually sent;
   the rest are logged `'skipped'` so a backdated invoice doesn't fire every past milestone as an
   email storm on the first run.
3. Tone escalates with `offset_days` (`toneForOffset()` in `lib/reminders.ts`): `before` (≤0) →
   `overdue` (1–13 days) → `seriously_overdue` (`SERIOUSLY_OVERDUE_THRESHOLD_DAYS` = 14+). The
   reminder-settings UI only offers offsets up to 30 days after due, if that threshold ever
   changes, check it's still reachable through the presets.
4. Each email optionally includes a "Pay now" button linking to `customers.payment_link ??
   profiles.payment_link`, a bring-your-own link (Stripe Payment Link, PayPal.me, etc.), not
   Stripe Connect. Chasry deliberately never touches the money itself.
5. Sent via Resend, `reply-to` set to the business owner's email. Logs `sent`/`failed`/`skipped`,
   read by the invoice detail page's reminder timeline.

**Failed sends retry; only `sent`/`skipped` are terminal.** The dedup set excludes `failed` rows
so the next run tries again (a `failed` row that counted as "already handled" would permanently
lose that reminder after one transient blip or one day over Resend's 100/day cap). Two things
keep the retry safe:

- **Writes are `upsert`s, not `insert`s** (`onConflict: "invoice_id,offset_days"`), a retry hits
  the existing row from the failed attempt; a plain insert would violate the unique constraint.
- **Retries are time-boxed** by `FAILED_RETRY_WINDOW_MS` (3 days after the offset's target date),
  otherwise the last offset in a schedule would retry daily forever against a possibly-dead
  address, burning quota and harming domain sending reputation.

**Known limitation, not fixed**: date comparison is UTC-based, not per-user timezone. A reminder
can land a few hours off from a user's local midnight. Acceptable for v1.
