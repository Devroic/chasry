import type { SubscriptionStatus } from "@/types/database.types";

/** Active (unpaid) invoices a free-plan account can have at once. */
export const FREE_INVOICE_LIMIT = 3;

export const PRO_PRICE_AMOUNT = "€10";
/** English-only label, for the deliberately English-only terms/privacy pages (see ARCHITECTURE.md). Every translated surface uses PRO_PRICE_AMOUNT plus its own localized "/month" unit text instead. */
export const PRO_PRICE_LABEL = `${PRO_PRICE_AMOUNT}/month`;

/** 'past_due' still counts as Pro — Stripe's own retry grace period, not a hard cutoff. */
export function isPro(status: SubscriptionStatus) {
  return status === "active" || status === "past_due";
}

export function planLabel(status: SubscriptionStatus) {
  return isPro(status) ? "Pro" : "Free";
}
