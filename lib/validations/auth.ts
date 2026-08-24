import { z } from "zod";
import type { Translator } from "./shared";

export function signupSchema(t: Translator) {
  return z.object({
    business_name: z.string().trim().min(1, t("businessNameRequired")).max(200),
    email: z.string().trim().email(t("emailInvalid")).max(320),
    password: z.string().min(8, t("passwordMinLength")).max(200),
  });
}

export function loginSchema(t: Translator) {
  return z.object({
    email: z.string().trim().email(t("emailInvalid")).max(320),
    password: z.string().min(1, t("passwordRequired")).max(200),
  });
}

export function requestResetSchema(t: Translator) {
  return z.object({
    email: z.string().trim().email(t("emailInvalid")).max(320),
  });
}

export function updatePasswordSchema(t: Translator) {
  return z.object({
    password: z.string().min(8, t("passwordMinLength")).max(200),
  });
}

export type SignupInput = z.infer<ReturnType<typeof signupSchema>>;
export type LoginInput = z.infer<ReturnType<typeof loginSchema>>;
