# Error monitoring (Sentry)

Read this before touching Sentry init, alerting, or adding a new `captureException` call.

`@sentry/nextjs`, org `chasry`, project `javascript-nextjs`, **EU region** (DSN points at
`ingest.de.sentry.io`, the US endpoint would silently reject these events).

Four init points, one per runtime:

| File | Runtime | Covers |
|---|---|---|
| `sentry.server.config.ts` | Node | Server Actions, Route Handlers, **the cron** |
| `sentry.edge.config.ts` | Edge | `proxy.ts` (session refresh + route guards) |
| `instrumentation-client.ts` | Browser | Client render/interaction errors |
| `instrumentation.ts` | — | Loads the right one; re-exports `onRequestError` |

`app/global-error.tsx` catches root-layout crashes with inline styles and a plain `<a>`
deliberately (it renders after the React tree has already failed, so `next/link` and
`globals.css` may themselves be broken).

**Deliberate configuration choices:**

- **Local development reports nothing.** `sentry.shared.ts` gates all three configs: reporting
  is on only when a DSN exists **and** `VERCEL_ENV` is set (present on Vercel, absent under plain
  `next dev`). Set `SENTRY_FORCE_ENABLE=1` in `.env.local` to test Sentry locally on purpose.
- **Preview deploys report but shouldn't email**, only production should. **Not yet applied**:
  Sentry's environment filter only offers environments it has actually seen events from, so
  `production` can't be selected before the first production deploy, see the "Production deploy
  checklist" in `ARCHITECTURE.md`.
- **`tracesSampleRate: 0`**, errors only. Raise deliberately if a latency problem ever justifies
  the free tier's event budget.
- **Session Replay is off** — it would ship client names, emails, and invoice amounts to a third
  party, not a privacy trade worth making for this data.
- **`tunnelRoute: "/monitoring"`** routes events through our own domain so ad/tracker blockers
  don't swallow reports from real users.
- **Not set up with `@sentry/wizard`**, it would have rewritten `next.config.ts` and destroyed
  the security headers and `next-intl` wrapper. Wrapper order matters:
  `withSentryConfig(withNextIntl(nextConfig))`, Sentry outermost.
- `disableLogger` is **not** set, it's deprecated in SDK 10 and emits a build warning.

**Explicit `captureException` calls** were added only to the two paths that fail *silently*,
everywhere else the automatic handlers suffice:

- `app/api/cron/send-reminders/route.ts` — 5 points, tagged `job: send-reminders` with a `stage`.
  A burst of `stage: send` signals Resend's 100/day cap was hit. Only invoice id and offset are
  attached, no client email or amount.
- `app/api/stripe/webhook/route.ts` — 4 points, tagged `integration: stripe`. Sync failures are
  `level: "fatal"` (someone paid and didn't get Pro). Signature failures are `level: "error"`,
  **not `warning`**, since alert priority is derived from log level (see below). A missing
  `STRIPE_WEBHOOK_SECRET` is reported separately at `fatal`.

**Alerting.** The default rule is "notify for high priority issues," and priority comes from
**log level**: `fatal`/`error` are high (emailed), `warning` and below are not — `level` is not
cosmetic. The alert fires on **new** issues only, not every occurrence.

**Cron check-in monitoring** (`MONITOR_SLUG = "send-reminders"`) closes the gap error reporting
structurally can't: if Vercel's scheduler stops invoking the route entirely, nothing throws,
nothing is reported, and the app looks healthy while silently sending no reminders. The check-in
starts *after* the auth/rate-limit guards (so a rejected probe isn't recorded as a job run), and
status is derived from `response.ok`, **not** whether the handler threw (the sweep signals
failure by *returning* 500). The monitor auto-creates from the crontab in the route
(`0 7 * * *` UTC, matching `vercel.json`).

**Source maps are not uploaded yet.** Needs `SENTRY_AUTH_TOKEN` in `.env.local` and Vercel.
Without it the build still succeeds, production stack traces are just minified.
