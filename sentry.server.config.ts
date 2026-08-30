// Sentry init for the Node.js runtime (cron + Stripe webhook). Loaded via
// instrumentation.ts, written by hand so next.config.ts keeps its own setup.
import * as Sentry from "@sentry/nextjs";
import { sentryDsn, sentryEnabled, sentryEnvironment } from "./sentry.shared";

Sentry.init({
  dsn: sentryDsn,

  // Off in local dev, and a no-op without a DSN — see sentry.shared.ts.
  enabled: sentryEnabled,

  // Errors only for now — traces are the expensive part of the free tier.
  tracesSampleRate: 0,

  // Never let Sentry's own noise reach users or dev logs.
  debug: false,
  // Facet the Sentry alert rule filters on, so only production emails.
  environment: sentryEnvironment,
});
