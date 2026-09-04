/**
 * Shared color vocabulary for status pills (`Badge variant="outline"`), with the dark-mode
 * variants raw Tailwind color classes lack.
 */
export const STATUS_TONES = {
  positive:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
  negative:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400",
  brand: "border-transparent bg-brand-primary-tint text-brand-primary",
  neutral: "border-transparent bg-muted text-muted-foreground",
} as const;

export type StatusTone = keyof typeof STATUS_TONES;
