import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSafeRelativePath } from "@/lib/return-to";

// Kept exported here for existing importers; the implementation lives in lib/return-to.
export { isSafeRelativePath };

const PUBLIC_AUTH_PATHS = ["/login", "/signup", "/reset-password"];

// One-time email links (password reset, signup confirm) — excluded from the auth-page bounce below.
const SESSION_ACTION_PATHS = ["/reset-password/confirm", "/signup/confirmed"];

// UX convenience only — every protected page also checks auth itself server-side.
const PROTECTED_PREFIXES = ["/dashboard", "/invoices", "/clients", "/settings", "/onboarding", "/admin"];


export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Required: touching getUser() refreshes the session cookie if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isSessionActionPath = SESSION_ACTION_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
  const isPublicAuthPath =
    !isSessionActionPath && PUBLIC_AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && isProtected) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublicAuthPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

/** Only redirect to a same-origin path we actually asked for, never an attacker-supplied one. */
export function safeNextPath(next: string | null | undefined) {
  return next && isSafeRelativePath(next) ? next : "/dashboard";
}
