import "server-only";
import { getAppUrl } from "@/lib/constants";
import { resend, ACCOUNT_FROM_EMAIL } from "@/lib/resend";
import SubscriptionCanceledEmail from "@/emails/subscription-canceled";
import { formatDate } from "@/lib/format";

/**
 * Sent when a cancellation is scheduled (in-app downgrade or Stripe portal),
 * not when the subscription is actually deleted at the period end. Best-effort.
 */
export async function sendSubscriptionCanceledEmail(email: string, periodEndIso: string) {
  const appUrl = getAppUrl();
  try {
    const { error: sendError } = await resend.emails.send({
      from: ACCOUNT_FROM_EMAIL,
      to: email,
      subject: "Your Chasry Pro subscription is canceled",
      react: SubscriptionCanceledEmail({ appUrl, accessUntil: formatDate(periodEndIso) }),
    });
    // Resend reports failures via the return value, not by throwing.
    if (sendError) throw new Error(sendError.message);
  } catch (err) {
    console.error("billing: subscription-canceled email failed", err);
  }
}
