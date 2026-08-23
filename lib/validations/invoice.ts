import { z } from "zod";
import { optionalText } from "./shared";

export const invoiceSchema = z.object({
  customer_id: z.string().uuid("Choose a client"),
  invoice_number: optionalText(100),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(100_000_000),
  currency: z.string().trim().length(3).default("EUR"),
  due_date: z.string().min(1, "Due date is required"),
  notes: optionalText(2000),
  reminder_offsets: z.array(z.number().int().min(-60).max(60)).max(10).nullable(),
  reminder_enabled: z.boolean().nullable(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const reminderOffsetsSchema = z.object({
  offsets: z
    .array(z.number().int().min(-60).max(60))
    .max(10, "Up to 10 reminders per invoice"),
  enabled: z.boolean(),
});

export type ReminderOffsetsInput = z.infer<typeof reminderOffsetsSchema>;
