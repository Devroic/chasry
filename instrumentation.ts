// Next.js entry point for server-side instrumentation. Loads the right Sentry
// config per runtime — the Node one for Server Actions/Route Handlers/the
// cron, the Edge one for proxy.ts.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Reports errors thrown inside Server Components / Server Actions, which
// otherwise surface only as a generic 500 with nothing recorded.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
