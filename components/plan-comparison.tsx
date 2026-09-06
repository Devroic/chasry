import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** One feature row of a plan card: included/excluded, or a short text value. */
export type PlanFeature = {
  label: string;
  value: boolean | string;
  proOnly?: boolean;
};

type PlansTranslator = (key: string) => string;

/**
 * Source of truth for what each plan includes, shared by the landing pricing section and
 * billing settings. `t` must be a translator scoped to the "plans" namespace.
 */
export function buildPlanFeatures(t: PlansTranslator): {
  free: PlanFeature[];
  pro: PlanFeature[];
} {
  const shared: PlanFeature[] = [
    { label: t("rowClients"), value: true },
    { label: t("rowReminders"), value: true },
    { label: t("rowLanguages"), value: true },
    { label: t("rowSchedules"), value: true },
    { label: t("rowClaims"), value: true },
    { label: t("rowDigest"), value: true },
  ];
  const proOnly = (value: boolean): PlanFeature[] => [
    { label: t("rowRecurring"), value, proOnly: true },
    { label: t("rowAttachments"), value, proOnly: true },
    { label: t("rowBranding"), value, proOnly: true },
  ];

  return {
    free: [
      { label: t("rowActiveInvoices"), value: t("rowActiveInvoicesFree") },
      ...shared,
      ...proOnly(false),
    ],
    pro: [
      { label: t("rowActiveInvoices"), value: t("rowActiveInvoicesPro"), proOnly: true },
      ...shared,
      ...proOnly(true),
    ],
  };
}

/** Renders a plan's feature list. Both plans list the same rows in order, so cards compare. */
export function PlanFeatureList({
  features,
  highlightProOnly = false,
  includedLabel,
  excludedLabel,
  className,
}: {
  features: PlanFeature[];
  /** Pro card: gives the Pro-only rows a soft brand tint. */
  highlightProOnly?: boolean;
  /** Screen-reader text for the icons, which alone say nothing. */
  includedLabel: string;
  excludedLabel: string;
  className?: string;
}) {
  return (
    <ul className={cn("space-y-1", className)}>
      {features.map((feature) => {
        const excluded = feature.value === false;
        return (
          <li
            key={feature.label}
            className={cn(
              "flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm",
              highlightProOnly && feature.proOnly && "bg-brand-primary-tint",
              excluded ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {excluded ? (
              <X aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
            ) : (
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-primary" />
            )}
            <span>
              {feature.label}
              {typeof feature.value === "string" && (
                <>
                  {": "}
                  <span className="font-semibold">{feature.value}</span>
                </>
              )}
            </span>
            <span className="sr-only">{excluded ? excludedLabel : includedLabel}</span>
          </li>
        );
      })}
    </ul>
  );
}
