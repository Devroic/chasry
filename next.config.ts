import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    serverActions: {
      // Default is 1MB, well under the invoice attachment's 5MB cap
      // (lib/invoice-attachment.ts's MAX_ATTACHMENT_BYTES). This limit is
      // for the whole multipart body, not just the file — measured a
      // ~1MB+ blowup once the rest of the invoice form's fields and
      // multipart boundary overhead are added on top of a file near the
      // cap, so this needs real headroom, not just "5MB plus a little."
      // Without it, a legitimate upload right at the cap gets rejected by
      // the framework before createInvoice/updateInvoice's own size check
      // ever runs — a crash page instead of the "too large" message.
      bodySizeLimit: "8mb",
    },
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Order matters: next-intl wraps the config first, then Sentry wraps the
// result. Sentry's plugin has to be outermost so its webpack/Turbopack hooks
// see the final config — including next-intl's additions.
//
// Written by hand rather than by `@sentry/wizard`, which would have rewritten
// this file and dropped the security headers and the next-intl wrapper above.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: "chasry",
  project: "javascript-nextjs",

  // Source map upload needs SENTRY_AUTH_TOKEN (a real secret — never commit
  // it; set it in .env.local and in Vercel's env vars). Without it the build
  // still succeeds, you just get minified stack traces in Sentry.
  silent: !process.env.CI,

  // Strips the uploaded source maps from the client bundle so the public
  // build doesn't ship readable source.
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  // Proxies Sentry requests through our own domain, so ad/tracker blockers
  // don't silently swallow error reports from real users' browsers.
  tunnelRoute: "/monitoring",
});
