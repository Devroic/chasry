import "server-only";
import { getAppUrl } from "@/lib/constants";
import { resend, ACCOUNT_FROM_EMAIL } from "@/lib/resend";
import SubscriptionCanceledEmail from "@/emails/subscription-canceled";
import { formatDate } from "@/lib/format";

/** Sent when a cancellation is scheduled, not when the sub is deleted at period end. Best-effort. */
export async function sendSubscriptionCanceledEmail(email: string, periodEndIso: string) {
  const appUrl = getAppUrl();
  try {
    const { error: sendError } = await resend.emails.send({
      from: ACCOUNT_FROM_EMAIL,
      to: email,
      subject: "Your Chasry Pro subscription is canceled",
      react: SubscriptionCanceledEmail({ appUrl, accessUntil: formatDate(periodEndIso) }),
    });
    if (sendError) throw new Error(sendError.message);
  } catch (err) {
    console.error("billing: subscription-canceled email failed", err);
  }
}
