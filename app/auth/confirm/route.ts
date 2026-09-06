import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

const ALLOWED_NEXT_PATHS = new Set([
  "/signup/confirmed",
  "/reset-password/confirm",
  "/settings/profile",
]);

/**
 * @supabase/ssr's browser client defaults to the PKCE auth flow, so every
 * Supabase email link (signup confirmation, password reset) redirects back
 * with a `?code=` that must be exchanged for a session server-side before
 * any page checking for one will see it — nothing else in this app did that,
 * so every link looked expired even when valid. Supabase itself already
 * validated the token and confirmed the email before generating this
 * redirect, independent of whether the exchange below succeeds.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = nextParam && ALLOWED_NEXT_PATHS.has(nextParam) ? nextParam : "/login";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // After a confirmed email change, keep the Stripe customer's email in step so
    // receipts and invoices go to the address the user now signs in with.
    if (next === "/settings/profile") {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", user.id)
            .single();
          if (profile?.stripe_customer_id) {
            await stripe.customers.update(profile.stripe_customer_id, { email: user.email });
          }
        }
      } catch (err) {
        console.error("auth/confirm: failed to sync Stripe customer email", err);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
