import "server-only";
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);

export const REMINDERS_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Chasry <reminders@chasry.com>";

// Account-lifecycle emails go to the subscriber, not their clients, so they use
// Supabase auth's sender identity, not REMINDERS_FROM_EMAIL.
export const ACCOUNT_FROM_EMAIL = "Chasry <noreply@chasry.com>";
