/**
 * Classes for the "where does this value come from" badge next to a cascaded setting
 * (payment link, reminder language, reminder schedule). A client- or invoice-specific value
 * gets the brand tint so overrides stand out; the account default stays muted.
 */
export function overrideBadgeClass(isCustom: boolean) {
  return isCustom
    ? "border-brand-primary/20 bg-brand-primary-tint text-brand-primary"
    : "text-muted-foreground";
}
