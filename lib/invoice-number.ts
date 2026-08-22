/**
 * Suggests the next invoice number by incrementing the trailing digits of
 * the last one used (e.g. "INV-1042" → "INV-1043"). Falls back to no
 * suggestion if there's no previous invoice or its number doesn't end in
 * digits — this is a convenience default, not an enforced format, so
 * there's nothing to validate or fall back to structurally.
 */
export function suggestNextInvoiceNumber(lastInvoiceNumber: string | null | undefined) {
  if (!lastInvoiceNumber) return "";
  const match = lastInvoiceNumber.match(/^(.*?)(\d+)$/);
  if (!match) return "";

  const [, prefix, digits] = match;
  const next = (Number(digits) + 1).toString().padStart(digits.length, "0");
  return `${prefix}${next}`;
}
