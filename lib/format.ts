import type { Locale } from "./locale";

const DATE_LOCALE_TAGS: Record<Locale, string> = {
  en: "en-IE",
  el: "el-GR",
};

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).format(amount);
}

/** `locale` is a plain `string` because next-intl's `getLocale()` is; unrecognized falls back to en. */
export function formatDate(date: string | Date, locale: string = "en") {
  return new Intl.DateTimeFormat(DATE_LOCALE_TAGS[locale as Locale] ?? DATE_LOCALE_TAGS.en, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(date) : date);
}

/** Today's calendar date in a timezone, as "YYYY-MM-DD" (en-CA gives ISO order). */
export function todayInTimeZone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  } catch {
    // Timezone comes from a client-controlled cookie, so an invalid one falls back to UTC.
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Whole days until the due date. UI passes the viewer's timezone; cron keeps the UTC default,
 * which is the reminder engine's own day boundary.
 */
export function daysUntil(dueDate: string, timeZone = "UTC") {
  const todayUtc = new Date(`${todayInTimeZone(timeZone)}T00:00:00Z`).getTime();
  const due = new Date(dueDate);
  const dueUtc = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  return Math.round((dueUtc - todayUtc) / 86_400_000);
}
