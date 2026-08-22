/** Adds `offsetDays` (may be negative) to an ISO date string, in UTC. */
export function addDaysUtc(isoDate: string, offsetDays: number): Date {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

/** Whether `date` (UTC) falls on today's UTC calendar day. */
export function isTodayUtc(date: Date): boolean {
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

export type ReminderTone = "before" | "overdue" | "seriously_overdue";

/** Days overdue at which reminders stop being a polite nudge and get direct instead. */
export const SERIOUSLY_OVERDUE_THRESHOLD_DAYS = 14;

/**
 * Negative/zero offsets (before or on the due date) read as a heads-up.
 * Positive offsets escalate in tone the further overdue they are — a
 * reminder 60 days late shouldn't read identically to one sent yesterday.
 */
export function toneForOffset(offsetDays: number): ReminderTone {
  if (offsetDays <= 0) return "before";
  return offsetDays >= SERIOUSLY_OVERDUE_THRESHOLD_DAYS ? "seriously_overdue" : "overdue";
}
