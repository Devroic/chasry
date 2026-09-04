import "server-only";
import { cookies } from "next/headers";

/**
 * The viewer's IANA timezone from the `tz` cookie, for display only (the reminder engine keeps
 * its UTC day boundary). Falls back to UTC when missing or invalid.
 */
export async function getUserTimeZone(): Promise<string> {
  const raw = (await cookies()).get("tz")?.value;
  if (!raw) return "UTC";
  const timeZone = decodeURIComponent(raw);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}
