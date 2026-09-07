import { render } from "@react-email/components";
import * as Sentry from "@sentry/nextjs";
import { getTranslations } from "next-intl/server";
import { buildReminderEmail } from "@/lib/reminder-email";
import { toneForOffset, type ReminderTone } from "@/lib/reminders";
import type { Locale } from "@/lib/locale";

export type ReminderPreview = {
  tone: ReminderTone;
  toneLabel: string;
  /** "Sent: 7 days before due · 3 days before due" — which steps use this tone. */
  sentLabel: string;
  subject: string;
  html: string;
};

const TONE_ORDER: ReminderTone[] = ["before", "overdue", "seriously_overdue"];

/**
 * Renders one reminder email per tone in `offsets`, through the same builder the cron uses.
 * Server-only (react-email render + next-intl/server).
 */
export async function buildReminderPreviews({
  offsets,
  businessName,
  invoiceNumber,
  amount,
  currency,
  dueDate,
  paymentLink,
  locale,
  showBranding = true,
}: {
  offsets: number[];
  businessName: string;
  invoiceNumber?: string | null;
  amount: number;
  currency: string;
  dueDate: string;
  paymentLink?: string;
  locale: Locale;
  /** Mirrors the plan-dependent footer the real send will use. */
  showBranding?: boolean;
}): Promise<ReminderPreview[]> {
  const tOffset = await getTranslations("offsetPicker");
  const tPreview = await getTranslations("reminderPreview");

  const toneLabels: Record<ReminderTone, string> = {
    before: tPreview("toneBefore"),
    overdue: tPreview("toneOverdue"),
    seriously_overdue: tPreview("toneFirm"),
  };

  const offsetLabel = (offsetDays: number) => {
    if (offsetDays === 0) return tOffset("onDueDateOption");
    if (offsetDays < 0) return tOffset("daysBeforeDue", { days: Math.abs(offsetDays) });
    return tOffset("daysAfterDue", { days: offsetDays });
  };

  const sorted = [...offsets].sort((a, b) => a - b);
  const byTone = new Map<ReminderTone, number[]>();
  for (const offset of sorted) {
    const tone = toneForOffset(offset);
    byTone.set(tone, [...(byTone.get(tone) ?? []), offset]);
  }

  const previews: ReminderPreview[] = [];
  for (const tone of TONE_ORDER) {
    const toneOffsets = byTone.get(tone);
    if (!toneOffsets) continue;

    // A failed tone is reported but must not take down the page or the other tones.
    try {
      const representative = toneOffsets[0];
      const { element, subject } = buildReminderEmail({
        offsetDays: representative,
        businessName,
        invoiceNumber,
        amount,
        currency,
        dueDate,
        paymentLink,
        locale,
        // Render the day-count as of the send day, not as of today.
        daysUntilDueOverride: -representative,
        showBranding,
        // Inert anchor, so the preview shows the "Already paid?" line without minting a token.
        claimUrl: "#",
      });

      previews.push({
        tone,
        toneLabel: toneLabels[tone],
        sentLabel: tPreview("sentLabel", {
          schedule: toneOffsets.map(offsetLabel).join(" · "),
        }),
        subject,
        html: await render(element),
      });
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: "reminder-preview" }, extra: { tone } });
    }
  }

  return previews;
}
