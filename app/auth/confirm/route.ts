import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_NEXT_PATHS = new Set(["/signup/confirmed", "/reset-password/confirm"]);

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
  }

  return NextResponse.redirect(`${origin}${next}`);
}
