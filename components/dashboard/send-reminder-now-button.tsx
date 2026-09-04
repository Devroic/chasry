"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { sendReminderNow } from "@/app/(dashboard)/invoices/actions";
import { BlockingOverlay } from "@/components/blocking-overlay";

/** Only for a reminder due today that hasn't sent; the cron gets one chance, no catch-up. */
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
    <>
      <BlockingOverlay show={pending} spinner={false} />
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await sendReminderNow(invoiceId, offsetDays).catch(() => ({
            error: tErrors("sendNowFailed"),
          }));
          if (result?.error) toast.error(result.error);
          else toast.success(t("sendNowToast"));
        })
      }
      className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline disabled:opacity-50"
    >
      <Send className="size-3" />
      {pending ? t("sending") : t("sendNow")}
    </button>
    </>
  );
}
