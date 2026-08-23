import { z } from "zod";

/**
 * An optional URL field from a form. Transforms blank to `null`, not
 * `undefined` — these forms always submit the field and re-save the whole
 * row, and Supabase's `.update()` JSON-serializes the payload, which drops
 * `undefined` keys entirely. Using `undefined` here would make clearing a
 * previously-set link silently do nothing instead of clearing it.
 */
export const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .url("Enter a full link, starting with https://")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

/**
 * An optional free-text field (notes, invoice number, etc). Same `null`-not-
 * `undefined` reasoning as `optionalUrl` above — this is the pattern every
 * optional-string field in the app should use, not a one-off.
 */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null));
}
