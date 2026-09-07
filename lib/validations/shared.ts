import { z } from "zod";

/**
 * Structurally satisfied by both `useTranslations()` (Client Components)
 * and an awaited `getTranslations()` (Server Components/Actions) — schemas
 * take one of these instead of hardcoding English messages, so the same
 * schema definition produces locale-correct errors on both the client
 * (real-time field validation) and the server (the re-validation every
 * Server Action does on its own, per `server-auth-actions`).
 */
export type Translator = (key: string, values?: Record<string, string | number>) => string;

/**
 * An optional URL field from a form. Transforms blank to `null`, not
 * `undefined` — these forms always submit the field and re-save the whole
 * row, and Supabase's `.update()` JSON-serializes the payload, which drops
 * `undefined` keys entirely. Using `undefined` here would make clearing a
 * previously-set link silently do nothing instead of clearing it.
 */
export function optionalUrl(t: Translator) {
  return z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v, ctx) => {
      if (!v) return null;
      // People type "paypal.me/name" or "www.example.com"; the value ends up as an email href, so it
      // needs a scheme. Add https:// when none is given, then insist on a real http(s) web address.
      const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
      let url: URL | null = null;
      try {
        url = new URL(withScheme);
      } catch {
        url = null;
      }
      const isWeb =
        url != null && (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
      if (!isWeb) {
        ctx.addIssue({ code: "custom", message: t("urlInvalid") });
        return z.NEVER;
      }
      return withScheme;
    });
}

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
