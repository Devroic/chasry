/**
 * Human-readable urgency relative to a due date (e.g. "3 days left",
 * "Due today", "2 days overdue") — shown next to raw dates on lists and
 * detail pages so a beginner doesn't have to do the date math themselves.
 * `t` is a next-intl translator scoped to the "invoices" namespace.
 */
export function dueStatusLabel(
  daysUntilDue: number,
  t: (key: "dueIn" | "dueToday" | "overdueBy", values?: { days: number }) => string
): string {
  if (daysUntilDue > 0) return t("dueIn", { days: daysUntilDue });
  if (daysUntilDue === 0) return t("dueToday");
  return t("overdueBy", { days: Math.abs(daysUntilDue) });
}

/** Adds `offsetDays` (may be negative) to an ISO date string, in UTC. */
export function addDaysUtc(isoDate: string, offsetDays: number): Date {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

/**
 * Adds calendar months to an ISO date, clamping the day to the target
 * month's length (Jan 31 + 1 month → Feb 28/29), in UTC. Used by the
 * recurring-invoice roller so month-end retainers don't drift into the
 * next month.
 */
export function addMonthsClampedUtc(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const daysInTarget = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, daysInTarget));
  return d.toISOString().slice(0, 10);
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

/**
 * Short, human-readable summary of a reminder schedule — used to show what
 * a client/invoice is currently inheriting before the user opts into a
 * custom one, e.g. "7, 3 days before, 1 day after due" or "Turned off".
 * `t` is a next-intl translator scoped to the "reminderOverride" namespace
 * (from either `useTranslations` or `getTranslations`), so this stays usable
 * from both client and server components.
 */
export function describeReminderSchedule(
  offsets: number[],
  enabled: boolean,
  t: (
    key: "turnedOff" | "noneScheduled" | "beforeSuffix" | "onDueDate" | "afterSuffix",
    values?: { days: number }
  ) => string
): string {
  if (!enabled) return t("turnedOff");
  if (offsets.length === 0) return t("noneScheduled");

  const before = offsets
    .filter((o) => o < 0)
    .sort((a, b) => b - a)
    .map((o) => Math.abs(o));
  const onDue = offsets.includes(0);
  const after = offsets
    .filter((o) => o > 0)
    .sort((a, b) => a - b);

  // ICU plural category needs a representative count, not the list length.
  const pluralCount = (list: number[]) => (list.length === 1 ? list[0] : 2);

  const parts: string[] = [];
  if (before.length)
    parts.push(`${before.join(", ")} ${t("beforeSuffix", { days: pluralCount(before) })}`);
  if (onDue) parts.push(t("onDueDate"));
  if (after.length)
    parts.push(`${after.join(", ")} ${t("afterSuffix", { days: pluralCount(after) })}`);

  return parts.join(" · ") || t("noneScheduled");
}
