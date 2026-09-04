"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Publishes the browser's timezone in the `tz` cookie so server-rendered date labels use the
 * viewer's calendar day. Refreshes once when the cookie changes, then no-ops.
 */
export function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone) return;
    const current = document.cookie.match(/(?:^|; )tz=([^;]*)/)?.[1];
    const next = encodeURIComponent(timeZone);
    if (current !== next) {
      document.cookie = `tz=${next}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [router]);

  return null;
}
