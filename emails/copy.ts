import type { Locale } from "@/lib/locale";

function dayWord(n: number, locale: Locale) {
  if (locale === "el") return n === 1 ? "ημέρα" : "ημέρες";
  return n === 1 ? "day" : "days";
}

function beforeDueClause(daysUntilDue: number, locale: Locale): string {
  if (locale === "el") {
    if (daysUntilDue > 0) return `λήγει σε ${daysUntilDue} ${dayWord(daysUntilDue, locale)}`;
    if (daysUntilDue === 0) return "λήγει σήμερα";
    return `έληξε πριν από ${-daysUntilDue} ${dayWord(-daysUntilDue, locale)}`;
  }
  if (daysUntilDue > 0) return `is due in ${daysUntilDue} ${dayWord(daysUntilDue, locale)}`;
  if (daysUntilDue === 0) return "is due today";
  return `was due ${-daysUntilDue} ${dayWord(-daysUntilDue, locale)} ago`;
}

export const emailCopy = {
  dueLabel: (dateStr: string, locale: Locale) => (locale === "el" ? `Λήξη: ${dateStr}` : `Due ${dateStr}`),
  wasDueLabel: (dateStr: string, locale: Locale) =>
    locale === "el" ? `Έληξε: ${dateStr}` : `Was due ${dateStr}`,
  invoiceLabel: (num: string, locale: Locale) => (locale === "el" ? `Τιμολόγιο ${num}` : `Invoice ${num}`),
  payNow: (locale: Locale) => (locale === "el" ? "Πληρωμή τώρα" : "Pay now"),
  footerPrefix: (businessName: string, locale: Locale) =>
    locale === "el"
      ? `Αυτή είναι μια αυτόματη υπενθύμιση πληρωμής από ${businessName} μέσω `
      : `This is an automatic payment reminder sent on behalf of ${businessName} via `,
  footerSuffix: (businessName: string, locale: Locale) => {
    if (locale === "el") {
      // Avoids a double period when businessName itself ends in one (e.g. "Co.").
      const period = businessName.trim().endsWith(".") ? "" : ".";
      return `. Απαντήστε απευθείας σε αυτό το email για να επικοινωνήσετε με ${businessName}${period}`;
    }
    return `. Just reply to this email to reach ${businessName} directly.`;
  },
  // Pro accounts get the brand-free footer — same explanation, no "via Chasry".
  footerNoBrand: (businessName: string, locale: Locale) => {
    if (locale === "el") {
      const period = businessName.trim().endsWith(".") ? "" : ".";
      return `Αυτή είναι μια αυτόματη υπενθύμιση πληρωμής από ${businessName}. Απαντήστε απευθείας σε αυτό το email για να επικοινωνήσετε με ${businessName}${period}`;
    }
    return `This is an automatic payment reminder from ${businessName}. Just reply to this email to reach ${businessName} directly.`;
  },
  claimPaidQuestion: (locale: Locale) =>
    locale === "el" ? "Έχετε ήδη πληρώσει αυτό το τιμολόγιο;" : "Already paid this invoice?",
  // Greek avoids the name here: it would need an article and case that depend on whether the
  // sender is a person or a company. "Ο αποστολέας" covers both; the footer names them anyway.
  claimPaidLink: (businessName: string, locale: Locale) =>
    locale === "el" ? "Ενημερώστε τον αποστολέα" : `Let ${businessName} know`,

  beforeDue: {
    dueClause: beforeDueClause,
    previewText: (dueClause: string, locale: Locale) =>
      locale === "el" ? `Φιλική υπενθύμιση: το τιμολόγιο ${dueClause}` : `Friendly reminder: invoice ${dueClause}`,
    // No name in the greeting: a client can be a company, and Greek names would need the vocative case.
    heading: (locale: Locale) => (locale === "el" ? "Μια φιλική υπενθύμιση" : "Just a friendly reminder"),
    body: (businessName: string, dueClause: string, locale: Locale) =>
      locale === "el"
        ? `Αυτό το τιμολόγιο από ${businessName} ${dueClause}. Δεν χρειάζεται καμία ενέργεια αν έχει ήδη προγραμματιστεί, είναι απλώς μια υπενθύμιση.`
        : `This invoice from ${businessName} ${dueClause}. No action needed if it's already scheduled, this is just a heads-up.`,
    closing: (locale: Locale) => (locale === "el" ? "Ευχαριστούμε για τη συνεργασία." : "Thanks for working with us."),
  },

  overdue: {
    previewText: (daysOverdue: number, locale: Locale) =>
      locale === "el"
        ? `Το τιμολόγιο είναι πλέον ${daysOverdue} ${dayWord(daysOverdue, locale)} εκπρόθεσμο`
        : `Invoice is now ${daysOverdue} ${dayWord(daysOverdue, locale)} overdue`,
    heading: (locale: Locale) =>
      locale === "el" ? "Αυτό το τιμολόγιο είναι πλέον εκπρόθεσμο" : "This invoice is now overdue",
    body: (businessName: string, daysOverdue: number, locale: Locale) =>
      locale === "el"
        ? `Αυτό το τιμολόγιο από ${businessName} έληξε πριν από ${daysOverdue} ${dayWord(daysOverdue, locale)} και δεν έχει σημειωθεί ακόμη ως πληρωμένο. Αν έχετε ήδη στείλει την πληρωμή, σας ευχαριστούμε, αγνοήστε αυτό το μήνυμα. Διαφορετικά, παρακαλούμε διευθετήστε την πληρωμή όποτε μπορέσετε.`
        : `This invoice from ${businessName} was due ${daysOverdue} ${dayWord(daysOverdue, locale)} ago and hasn't been marked as paid yet. If you've already sent payment, thank you, feel free to ignore this. Otherwise, please arrange payment when you get a chance.`,
    closing: (locale: Locale) => (locale === "el" ? "Ευχαριστούμε για τη συνεργασία." : "Thanks for working with us."),
  },

  seriouslyOverdue: {
    previewText: (daysOverdue: number, locale: Locale) =>
      locale === "el"
        ? `Το τιμολόγιο είναι πλέον ${daysOverdue} ημέρες εκπρόθεσμο, παρακαλούμε διευθετήστε την πληρωμή`
        : `Invoice is now ${daysOverdue} days overdue, please arrange payment`,
    heading: (locale: Locale) =>
      locale === "el" ? "Αυτή η πληρωμή είναι σημαντικά εκπρόθεσμη" : "This payment is significantly overdue",
    body: (businessName: string, daysOverdue: number, locale: Locale) =>
      locale === "el"
        ? `Αυτό το τιμολόγιο από ${businessName} έληξε πριν από ${daysOverdue} ημέρες. Παρακαλούμε διευθετήστε την πληρωμή το συντομότερο δυνατό, ή απαντήστε σε αυτό το email αν υπάρχει κάποιο ζήτημα που πρέπει να γνωρίζουμε.`
        : `This invoice from ${businessName} was due ${daysOverdue} days ago. Please arrange payment as soon as possible, or reply to this email if there's an issue we should know about.`,
    closing: (locale: Locale) =>
      locale === "el" ? "Θα εκτιμούσαμε την άμεση διευθέτηση αυτού του θέματος." : "We'd appreciate this being resolved promptly.",
  },

  subject: {
    invoiceRef: (num: string | undefined, locale: Locale) => {
      if (locale === "el") return num ? `το τιμολόγιο ${num}` : "το τιμολόγιο";
      return num ? `invoice ${num}` : "invoice";
    },
    dueSoon: (prefix: string, invoiceRef: string, businessName: string, locale: Locale) =>
      locale === "el"
        ? `${prefix}Υπενθύμιση: ${invoiceRef} λήγει σύντομα από ${businessName}`
        : `${prefix}Reminder: ${invoiceRef} due soon from ${businessName}`,
    dueToday: (prefix: string, invoiceRef: string, businessName: string, locale: Locale) =>
      locale === "el"
        ? `${prefix}Υπενθύμιση: ${invoiceRef} λήγει σήμερα από ${businessName}`
        : `${prefix}Reminder: ${invoiceRef} due today from ${businessName}`,
    dueRecently: (prefix: string, invoiceRef: string, businessName: string, locale: Locale) =>
      locale === "el"
        ? `${prefix}Υπενθύμιση: ${invoiceRef} έληξε πρόσφατα από ${businessName}`
        : `${prefix}Reminder: ${invoiceRef} was due recently from ${businessName}`,
    overdue: (prefix: string, invoiceRef: string, businessName: string, locale: Locale) =>
      locale === "el"
        ? `${prefix}Εκπρόθεσμο: ${invoiceRef} από ${businessName}`
        : `${prefix}Overdue: ${invoiceRef} from ${businessName}`,
    seriouslyOverdue: (prefix: string, invoiceRef: string, businessName: string, locale: Locale) =>
      locale === "el"
        ? `${prefix}Παρακαλούμε διευθετήστε την πληρωμή: ${invoiceRef} από ${businessName}`
        : `${prefix}Please arrange payment: ${invoiceRef} from ${businessName}`,
  },
};
