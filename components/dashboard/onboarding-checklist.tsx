import Link from "next/link";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OnboardingChecklist({
  hasCustomer,
  hasInvoice,
}: {
  hasCustomer: boolean;
  hasInvoice: boolean;
}) {
  const steps = [
    {
      done: hasCustomer,
      title: "Add your first client",
      description: "Their name and email — that's all Chasry needs.",
      href: "/customers/new",
      cta: "Add a client",
    },
    {
      done: hasInvoice,
      title: "Log an unpaid invoice",
      description: "Amount and due date. Thirty seconds of work.",
      href: "/invoices/new",
      cta: "Add an invoice",
    },
    {
      done: false,
      title: "Check your reminder schedule",
      description: "We default to 7 days before, 3 days before, and 1 day after.",
      href: "/settings/reminders",
      cta: "Review schedule",
    },
  ];

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Get set up</h2>
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
