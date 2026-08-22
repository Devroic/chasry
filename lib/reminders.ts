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

export type ReminderTone = "before" | "overdue";

/** Negative/zero offsets (before or on the due date) read as a heads-up; positive offsets read as overdue. */
export function toneForOffset(offsetDays: number): ReminderTone {
  return offsetDays > 0 ? "overdue" : "before";
}
