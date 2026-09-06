import { z } from "zod";
import { LOCALES } from "@/lib/locale";
import { optionalText, optionalUrl, type Translator } from "./shared";

export function invoiceSchema(t: Translator) {
  return z.object({
    customer_id: z.string().uuid(t("customerRequired")),
    invoice_number: optionalText(100),
    amount: z.coerce.number().positive(t("amountPositive")).max(100_000_000),
    currency: z.string().trim().length(3).default("EUR"),
    due_date: z.string().min(1, t("dueDateRequired")),
    notes: optionalText(2000),
    recurring: z.enum(["none", "monthly"]).default("none"),
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
    copy_self: z.boolean(),
  });
}

export type ReminderOffsetsInput = z.infer<ReturnType<typeof reminderOffsetsSchema>>;

/**
 * The Reminders settings form: the schedule (written to `reminder_settings`)
 * plus the two profile-level reminder-email prefs (payment link + language,
 * written to `profiles`). The action splits the parsed result across both tables.
 */
export function reminderSettingsFormSchema(t: Translator) {
  return reminderOffsetsSchema(t).extend({
    payment_link: optionalUrl(t),
    reminder_locale: z.enum(LOCALES),
  });
}

export type ReminderSettingsFormInput = z.infer<ReturnType<typeof reminderSettingsFormSchema>>;
