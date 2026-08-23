export const LOCALES = ["en", "el"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "chasry_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  el: "Ελληνικά",
};
