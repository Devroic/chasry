/**
 * Shared Sentry gating, so the client / server / edge configs can't drift
 * apart on *when* reporting is active.
 *
 * `VERCEL_ENV` is set only when running on Vercel ("production" | "preview" |
 * "development" for `vercel dev`). It is absent on a plain `next dev`, which
 * is exactly the signal we want: **local development reports nothing.**
 *
 * Why gate at the SDK rather than only muting the alert in Sentry:
 *  - the free tier is 5,000 events/month, and a single crash loop while
 *    developing could burn a meaningful share of it for no benefit
 *  - locally you already see the error in the terminal and the browser
 *    console — Sentry adds nothing there
 *  - it keeps the issue feed free of noise that never affected a real user
 *
 * Preview deployments *do* still report. They run real code against real
 * infrastructure, so a failure there is worth capturing — but emails are
 * scoped to `production` by the alert rule in Sentry, so previews stay
 * visible in the dashboard without pinging your inbox.
 *
 * To test Sentry locally on purpose, set SENTRY_FORCE_ENABLE=1 in .env.local.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const sentryEnabled =
  Boolean(dsn) &&
  (Boolean(process.env.VERCEL_ENV) || process.env.SENTRY_FORCE_ENABLE === "1");

/** production | preview | development — the facet alert rules filter on. */
export const sentryEnvironment =
  process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";

export const sentryDsn = dsn;
