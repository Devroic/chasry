import { z } from "zod";
import { optionalText, type Translator } from "./shared";

export function invoiceSchema(t: Translator) {
  return z.object({
    customer_id: z.string().uuid(t("customerRequired")),
    invoice_number: optionalText(100),
    amount: z.coerce.number().positive(t("amountPositive")).max(100_000_000),
    currency: z.string().trim().length(3).default("EUR"),
    due_date: z.string().min(1, t("dueDateRequired")),
    notes: optionalText(2000),
    reminder_offsets: z.array(z.number().int().min(-60).max(60)).max(10).nullable(),
    reminder_enabled: z.boolean().nullable(),
  });
}

export type InvoiceInput = z.infer<ReturnType<typeof invoiceSchema>>;

export function reminderOffsetsSchema(t: Translator) {
  return z.object({
    offsets: z
      .array(z.number().int().min(-60).max(60))
      .max(10, t("tooManyOffsets")),
    enabled: z.boolean(),
  });
}

export type ReminderOffsetsInput = z.infer<ReturnType<typeof reminderOffsetsSchema>>;
