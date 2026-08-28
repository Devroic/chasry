// Manually fires the reminder cron against your local dev server. In
// production this runs on its own via Vercel Cron (see vercel.json), but
// nothing triggers it automatically in `next dev` — this is the local
// stand-in, same route, same auth, just invoked by hand instead of by
// Vercel's schedule.
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

if (!env.CRON_SECRET) {
  console.error("CRON_SECRET is not set in .env.local");
  process.exit(1);
}

const port = process.env.PORT || 3000;
const url = `http://localhost:${port}/api/cron/send-reminders`;

console.log(`Triggering ${url} ...`);
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
});
const body = await res.json();
console.log(res.status, body);

if (!res.ok) process.exit(1);
