import Link from "next/link";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function OnboardingChecklist({
  hasCustomer,
  hasInvoice,
}: {
  hasCustomer: boolean;
  hasInvoice: boolean;
}) {
  const t = await getTranslations("dashboard");
  const steps = [
    {
      done: hasCustomer,
      title: t("checklist.addClientTitle"),
      description: t("checklist.addClientDescription"),
      href: "/clients/new",
      cta: t("checklist.addClientCta"),
    },
    {
      done: hasInvoice,
      title: t("checklist.addInvoiceTitle"),
      description: t("checklist.addInvoiceDescription"),
      href: "/invoices/new",
      cta: t("checklist.addInvoiceCta"),
    },
    {
      done: false,
      title: t("checklist.checkScheduleTitle"),
      description: t("checklist.checkScheduleDescription"),
      href: "/settings/reminders",
      cta: t("checklist.checkScheduleCta"),
    },
  ];

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">{t("getSetUp")}</h2>
      <ol className="space-y-4">
        {steps.map((step) => (
          <li key={step.title} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
                step.done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-border text-muted-foreground"
              )}
            >
              {step.done && <Check className="size-3" />}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.done ? "text-muted-foreground line-through" : "text-foreground"
                )}
              >
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {!step.done && (
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href={step.href}>{step.cta}</Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
