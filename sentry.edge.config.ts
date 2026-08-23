// Sentry init for the Edge runtime. `proxy.ts` (the Supabase session refresh
// + route guard) runs here, so without this a failure in the auth redirect
// path would go unreported.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0,
  debug: false,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});
