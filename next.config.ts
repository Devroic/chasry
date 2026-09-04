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
  async redirects() {
    return [
      // Keeps bookmarks working after the route was renamed to "Clients".
      { source: "/customers", destination: "/clients", permanent: true },
      { source: "/customers/:path*", destination: "/clients/:path*", permanent: true },
      // The standalone upgrade page folded into billing settings, which shows the
      // same plan comparison and checkout.
      { source: "/upgrade", destination: "/settings/billing", permanent: true },
    ];
  },
  experimental: {
    serverActions: {
      // Covers the whole multipart body, so it needs headroom above MAX_ATTACHMENT_BYTES.
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

  // Strips the uploaded source maps from the client bundle.
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  // Proxies Sentry through our own domain, so tracker blockers don't swallow error reports.
  tunnelRoute: "/monitoring",
});
