import { z } from "zod";

export const signupSchema = z.object({
  business_name: z.string().trim().min(1, "Business name is required").max(200),
  email: z.string().trim().email("Enter a valid email").max(320),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(320),
  password: z.string().min(1, "Password is required").max(200),
});

export const requestResetSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(320),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
