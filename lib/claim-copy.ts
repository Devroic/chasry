import type { Locale } from "@/lib/locale";

/**
 * Copy for the public "I've paid" page. Not next-intl: the reader is the freelancer's client, so
 * language follows the invoice's reminder locale cascade, not this browser's cookie.
 */
export const claimCopy = {
  title: (locale: Locale) => (locale === "el" ? "Επιβεβαίωση πληρωμής" : "Confirm your payment"),
  intro: (businessName: string, locale: Locale) =>
    locale === "el"
      ? `Πείτε στην επιχείρηση ${businessName} ότι έχετε ήδη στείλει την πληρωμή για αυτό το τιμολόγιο. Οι υπενθυμίσεις θα σταματήσουν μέχρι να επιβεβαιωθεί η παραλαβή της.`
      : `Let ${businessName} know you've already sent payment for this invoice. Reminders will pause until they confirm it arrived.`,
  invoiceLabel: (locale: Locale) => (locale === "el" ? "Τιμολόγιο" : "Invoice"),
  button: (locale: Locale) => (locale === "el" ? "Έχω στείλει την πληρωμή" : "I've sent this payment"),
  doneTitle: (locale: Locale) => (locale === "el" ? "Ευχαριστούμε!" : "Thank you!"),
  doneBody: (businessName: string, locale: Locale) =>
    locale === "el"
      ? `Ενημερώσαμε την επιχείρηση ${businessName}. Δεν χρειάζεται να κάνετε κάτι άλλο.`
      : `We've let ${businessName} know. Nothing else to do on your side.`,
  alreadyPaidTitle: (locale: Locale) =>
    locale === "el" ? "Έχει ήδη εξοφληθεί" : "Already settled",
  alreadyPaidBody: (businessName: string, locale: Locale) =>
    locale === "el"
      ? `Αυτό το τιμολόγιο έχει ήδη σημειωθεί ως πληρωμένο από την επιχείρηση ${businessName}. Ευχαριστούμε!`
      : `This invoice has already been marked as paid by ${businessName}. Thank you!`,
  invalidTitle: (locale: Locale) =>
    locale === "el" ? "Ο σύνδεσμος δεν είναι πλέον έγκυρος" : "This link is no longer valid",
  invalidBody: (locale: Locale) =>
    locale === "el"
      ? "Ο σύνδεσμος μπορεί να έχει λήξει. Αν πιστεύετε ότι πρόκειται για λάθος, απαντήστε στο email υπενθύμισης που λάβατε."
      : "The link may have expired. If you think this is a mistake, just reply to the reminder email you received.",
};
