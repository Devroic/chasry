import "server-only";
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);

export const REMINDERS_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Chasry <reminders@chasry.com>";

// Account-lifecycle emails (welcome, upgraded to Pro) go to the Chasry
// subscriber themselves, not their customers, so they use the same sender
// identity as Supabase's own auth emails (noreply@chasry.com) rather than
// REMINDERS_FROM_EMAIL, which is specifically for the chase-payment emails
// sent to someone else's clients.
export const ACCOUNT_FROM_EMAIL = "Chasry <noreply@chasry.com>";
