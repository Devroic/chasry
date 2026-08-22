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
