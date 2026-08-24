"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Last-resort boundary for errors thrown in the root layout itself — the only
 * case React can't render the normal UI around, so this replaces `<html>`
 * wholesale and can't use any of the app's providers, fonts or theme tokens.
 *
 * Deliberately plain inline styles: reaching for `globals.css` classes here
 * would be a bug waiting to happen, since a stylesheet failure is one of the
 * things that could land you on this page in the first place. Copy stays
 * calm and non-technical — the stack trace goes to Sentry, not to the user.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          background: "#ffffff",
          color: "#0d0d0d",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#475569" }}>
            Sorry, that&rsquo;s on us, not you. We&rsquo;ve been notified and we&rsquo;re looking
            into it. Your invoices and reminders are unaffected.
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
              Deliberate: this boundary only renders when the root layout has
              already crashed, so `next/link` would attempt a client-side
              navigation through the broken React tree. A plain anchor forces
              a full document load, which is the only reliable way out. */}
          <a
            href="/"
            style={{
              display: "inline-block",
              marginTop: "1.5rem",
              padding: "0.625rem 1.25rem",
              borderRadius: "0.875rem",
              background: "#23458d",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Back to Chasry
          </a>
        </div>
      </body>
    </html>
  );
}
