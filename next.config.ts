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
      // Default is 1MB — covers the whole multipart body, not just the file, so
      // needs real headroom above the 5MB attachment cap (MAX_ATTACHMENT_BYTES).
      bodySizeLimit: "8mb",
    },
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Order matters: next-intl wraps first, Sentry wraps outermost so its hooks see the final config.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: "chasry",
  project: "javascript-nextjs",

  // Source map upload needs SENTRY_AUTH_TOKEN; without it, minified traces only.
  silent: !process.env.CI,

  // Strips the uploaded source maps from the client bundle so the public
  // build doesn't ship readable source.
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  // Proxies Sentry requests through our own domain, so ad/tracker blockers
  // don't silently swallow error reports from real users' browsers.
  tunnelRoute: "/monitoring",
});
