// Sentry init for the Node.js runtime — this is the one that matters most
// here, because the two paths that fail *silently* both run server-side: the
// daily reminder cron (nobody is watching at 07:00 UTC) and the Stripe
// webhook (a failure means someone paid and didn't get Pro).
//
// Loaded via instrumentation.ts. Written by hand rather than by
// `@sentry/wizard` so next.config.ts keeps its security headers and the
// next-intl plugin wrapper.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // No DSN (local dev, CI) => the SDK no-ops. Nothing to guard.
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Errors only for now. Traces are the expensive part of the 5k/month free
  // tier and this app has no perf problem worth sampling yet; turn this up
  // deliberately if you ever need latency data.
  tracesSampleRate: 0,

  // Never let Sentry's own noise reach users or dev logs.
  debug: false,

  // Environment shows up as a filter/facet in the Sentry UI, so a local
  // mistake can't be confused with a real production incident.
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});
