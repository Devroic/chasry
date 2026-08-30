// Sentry init for the browser — catches client-side render/interaction errors.
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

  // Session Replay off — would capture real client names/emails/amounts into a third party.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

// Required by Next.js to report navigation timing/errors from the App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
