// Sentry init for the browser. Catches client-side render/interaction errors
// — the class of bug that produced the ThemeToggle hydration mismatch, which
// logged on every dark-mode page load and went unnoticed for days because
// nothing was watching the console.
import * as Sentry from "@sentry/nextjs";
import { sentryDsn, sentryEnabled, sentryEnvironment } from "./sentry.shared";

Sentry.init({
  dsn: sentryDsn,
  // Off in local dev — see sentry.shared.ts.
  enabled: sentryEnabled,
  tracesSampleRate: 0,
  debug: false,
  // Facet the Sentry alert rule filters on, so only production emails.
  environment: sentryEnvironment,

  // Session Replay is off: it records user sessions, which on this app means
  // capturing real client names, email addresses and invoice amounts into a
  // third party. Not worth the privacy surface for a tool handling other
  // people's billing data — and it's the main driver of free-tier quota.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

// Required by Next.js to report navigation timing/errors from the App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
