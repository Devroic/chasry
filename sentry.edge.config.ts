// Sentry init for the Edge runtime. `proxy.ts` (the Supabase session refresh
// + route guard) runs here, so without this a failure in the auth redirect
// path would go unreported.
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
});
