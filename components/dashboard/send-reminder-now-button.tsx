"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { sendReminderNow } from "@/app/(dashboard)/invoices/actions";

/** Shown only next to a reminder row whose target date is exactly today
 * and hasn't sent yet — see sendReminderNow's own comment for why this
 * exists (the cron only gets one chance at its target day, no catch-up). */
export function SendReminderNowButton({
  invoiceId,
  offsetDays,
}: {
  invoiceId: string;
  offsetDays: number;
}) {
  const [pending, startTransition] = useTransition();
  const t = useTranslations("reminderTimeline");
  const tErrors = useTranslations("invoiceActionErrors");

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await sendReminderNow(invoiceId, offsetDays);
            toast.success(t("sendNowToast"));
          } catch (err) {
            toast.error(err instanceof Error ? err.message : tErrors("sendNowFailed"));
          }
        })
      }
      className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline disabled:opacity-50"
    >
      <Send className="size-3" />
      {pending ? t("sending") : t("sendNow")}
    </button>
  );
}
