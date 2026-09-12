import "server-only";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { checkCronRateLimit } from "@/lib/rate-limit";

/** CRON_SECRET bearer check. Comparison must stay constant-time, never `===`. */
export function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);
  if (headerBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(headerBuf, expectedBuf);
}

/**
 * Cron GET pipeline: auth, rate limit, then a Sentry monitor check-in around `run()` that also
 * flags a missing run. `schedule` must mirror the route's crontab in vercel.json.
 */
export async function handleCronRequest(
  request: Request,
  {
    monitorSlug,
    schedule,
    run,
  }: {
    monitorSlug: string;
    schedule: string;
    run: () => Promise<NextResponse>;
  }
): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = await checkCronRateLimit(monitorSlug);
  if (!success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const checkInId = Sentry.captureCheckIn(
    { monitorSlug, status: "in_progress" },
    {
      schedule: { type: "crontab", value: schedule },
      // Grace period before a missed run is flagged, absorbing a late start.
      checkinMargin: 60,
      // Routes set maxDuration 60s; alert if a run overruns well past it.
      maxRuntime: 5,
      timezone: "UTC",
    }
  );

  try {
    const response = await run();
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug,
      // Jobs signal failure via 500, not a throw, so status derives from the response.
      status: response.ok ? "ok" : "error",
    });
    await flushSentry(monitorSlug);
    return response;
  } catch (err) {
    Sentry.captureCheckIn({ checkInId, monitorSlug, status: "error" });
    Sentry.captureException(err, { tags: { job: monitorSlug, stage: "unhandled" } });
    console.error(`cron/${monitorSlug}: unhandled failure`, err);
    await flushSentry(monitorSlug);
    return NextResponse.json({ error: "Cron run failed" }, { status: 500 });
  }
}

/**
 * The closing check-in is queued right before the handler returns, and Vercel freezes the
 * function as soon as the response goes out, so without a flush it is often never delivered.
 * Sentry then sees only "in_progress" and raises a timeout alert for a run that finished fine.
 */
async function flushSentry(monitorSlug: string) {
  const delivered = await Sentry.flush(5000);
  if (!delivered) console.error(`cron/${monitorSlug}: Sentry flush timed out`);
}
