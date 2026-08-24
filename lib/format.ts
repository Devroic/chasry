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

/**
 * `locale` takes a plain `string` (not the narrower `Locale` type) because
 * next-intl's `getLocale()` returns `string`, not a type narrowed to our own
 * LOCALES constant. Falls back to English for anything unrecognized.
 */
export function formatDate(date: string | Date, locale: string = "en") {
  return new Intl.DateTimeFormat(DATE_LOCALE_TAGS[locale as Locale] ?? DATE_LOCALE_TAGS.en, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(date) : date);
}

/** Days until `dueDate` (negative if already past). Compares whole UTC days. */
export function daysUntil(dueDate: string) {
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(dueDate);
  const dueUtc = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  return Math.round((dueUtc - todayUtc) / 86_400_000);
}
