import { z } from "zod";
import { optionalUrl } from "./shared";

export const profileSchema = z.object({
  business_name: z.string().trim().min(1, "Business name is required").max(200),
  timezone: z.string().trim().min(1).max(100),
  currency: z.string().trim().length(3),
  payment_link: optionalUrl,
});

export type ProfileInput = z.infer<typeof profileSchema>;
