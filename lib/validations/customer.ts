import { z } from "zod";
import { LOCALES } from "@/lib/locale";
import { optionalText, optionalUrl, type Translator } from "./shared";

export function customerSchema(t: Translator) {
  return z.object({
    name: z.string().trim().min(1, t("nameRequired")).max(200),
    email: z.string().trim().email(t("emailInvalid")).max(320),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[0-9+()\s-]*$/, t("phoneInvalid"))
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    notes: optionalText(2000),
    payment_link: optionalUrl(t),
    reminder_offsets: z.array(z.number().int().min(-60).max(60)).max(10).nullable(),
    reminder_enabled: z.boolean().nullable(),
    reminder_locale: z
      .enum(LOCALES)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
  });
}

export type CustomerInput = z.infer<ReturnType<typeof customerSchema>>;
