import { z } from "zod";
import { type Translator } from "./shared";

export function profileSchema(t: Translator) {
  return z.object({
    business_name: z.string().trim().min(1, t("businessNameRequired")).max(200),
    currency: z.string().trim().length(3),
    email: z.string().trim().email(t("emailInvalid")).max(320),
  });
}

export type ProfileInput = z.infer<ReturnType<typeof profileSchema>>;
