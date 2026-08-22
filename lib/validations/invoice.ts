import { z } from "zod";
import { optionalUrl } from "./shared";

export const invoiceSchema = z.object({
  customer_id: z.string().uuid("Choose a client"),
  invoice_number: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(100_000_000),
  currency: z.string().trim().length(3).default("EUR"),
  issued_date: z.string().min(1, "Issued date is required"),
  due_date: z.string().min(1, "Due date is required"),
  payment_link: optionalUrl,
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const reminderOffsetsSchema = z.object({
  offsets: z
    .array(z.number().int().min(-60).max(60))
    .max(10, "Up to 10 reminders per invoice"),
  enabled: z.boolean(),
});

export type ReminderOffsetsInput = z.infer<typeof reminderOffsetsSchema>;
