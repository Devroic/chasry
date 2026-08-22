import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

// Upstash is optional (free tier, but an extra account to set up). Without it
// configured, rate limiting is a no-op instead of blocking auth entirely —
// suitable for local dev, not recommended left off in production.
const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "chasry:auth",
    })
  : null;

const cronLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "chasry:cron",
    })
  : null;

export async function checkAuthRateLimit(identifier: string) {
  if (!authLimiter) return { success: true };
  return authLimiter.limit(identifier);
}

export async function checkCronRateLimit(identifier: string) {
  if (!cronLimiter) return { success: true };
  return cronLimiter.limit(identifier);
}
