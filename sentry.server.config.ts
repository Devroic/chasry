// Sentry init for the Node.js runtime — this is the one that matters most
// here, because the two paths that fail *silently* both run server-side: the
// daily reminder cron (nobody is watching at 07:00 UTC) and the Stripe
// webhook (a failure means someone paid and didn't get Pro).
//
// Loaded via instrumentation.ts. Written by hand rather than by
// `@sentry/wizard` so next.config.ts keeps its security headers and the
// next-intl plugin wrapper.
import * as Sentry from "@sentry/nextjs";
import { sentryDsn, sentryEnabled, sentryEnvironment } from "./sentry.shared";

Sentry.init({
  dsn: sentryDsn,

  // Off in local dev, and a no-op without a DSN — see sentry.shared.ts.
  enabled: sentryEnabled,

  // Errors only for now. Traces are the expensive part of the 5k/month free
  // tier and this app has no perf problem worth sampling yet; turn this up
  // deliberately if you ever need latency data.
  tracesSampleRate: 0,

  // Never let Sentry's own noise reach users or dev logs.
  debug: false,
  // Facet the Sentry alert rule filters on, so only production emails.
  environment: sentryEnvironment,
});
