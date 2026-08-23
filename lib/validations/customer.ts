import { z } from "zod";
import { optionalText, optionalUrl } from "./shared";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email").max(320),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\s-]*$/, "Numbers only — use +, spaces, or dashes if needed")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  notes: optionalText(2000),
  payment_link: optionalUrl,
  reminder_offsets: z.array(z.number().int().min(-60).max(60)).max(10).nullable(),
  reminder_enabled: z.boolean().nullable(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
