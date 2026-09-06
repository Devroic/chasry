import { z } from "zod";
import type { Translator } from "./shared";

export function signupSchema(t: Translator) {
  return z
    .object({
      business_name: z.string().trim().min(1, t("businessNameRequired")).max(200),
      email: z.string().trim().email(t("emailInvalid")).max(320),
      password: z.string().min(1, t("passwordRequired")).min(8, t("passwordMinLength")).max(200),
      confirm_password: z.string().min(1, t("passwordRequired")),
      terms_accepted: z.boolean().refine((v) => v === true, { message: t("termsRequired") }),
    })
    .refine((data) => data.password === data.confirm_password, {
      message: t("passwordsDoNotMatch"),
      path: ["confirm_password"],
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
    password: z.string().min(1, t("passwordRequired")).min(8, t("passwordMinLength")).max(200),
  });
}

export function changePasswordSchema(t: Translator) {
  return z
    .object({
      current_password: z.string().min(1, t("passwordRequired")),
      password: z.string().min(1, t("passwordRequired")).min(8, t("passwordMinLength")).max(200),
      confirm_password: z.string().min(1, t("passwordRequired")),
    })
    .refine((data) => data.password === data.confirm_password, {
      message: t("passwordsDoNotMatch"),
      path: ["confirm_password"],
    });
}

export function changeEmailSchema(t: Translator) {
  return z.object({
    email: z.string().trim().email(t("emailInvalid")).max(320),
  });
}

export type ChangePasswordInput = z.infer<ReturnType<typeof changePasswordSchema>>;
export type ChangeEmailInput = z.infer<ReturnType<typeof changeEmailSchema>>;

export type SignupInput = z.infer<ReturnType<typeof signupSchema>>;
export type LoginInput = z.infer<ReturnType<typeof loginSchema>>;
