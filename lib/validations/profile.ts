import { z } from "zod";
import { LOCALES } from "@/lib/locale";
import { optionalUrl, type Translator } from "./shared";

export function profileSchema(t: Translator) {
  return z.object({
    business_name: z.string().trim().min(1, t("businessNameRequired")).max(200),
    currency: z.string().trim().length(3),
    payment_link: optionalUrl(t),
    reminder_locale: z.enum(LOCALES),
  });
}

export type ProfileInput = z.infer<ReturnType<typeof profileSchema>>;
