import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_AUTH_PATHS = ["/login", "/signup", "/reset-password"];

// These consume a one-time link from an email (password reset, signup
// confirmation) and must render regardless of whether the visitor already
// has an active session elsewhere — excluded from the "bounce logged-in
// users off auth pages" redirect below so clicking the link never skips
// straight to /dashboard before the page can show its result.
const SESSION_ACTION_PATHS = ["/reset-password/confirm", "/signup/confirmed"];

// Only these need a session — everything else (including a mistyped URL)
// falls through to Next.js's own routing, so a logged-out visitor hitting a
// bad link sees the real not-found page instead of always bouncing to
// /login. Every protected page also checks auth itself server-side
// (requireUser()/requireOnboardedUser() in lib/auth.ts) — this redirect is
// a UX convenience (skip the flash of a page that's about to bounce you
// anyway), not the actual security boundary.
const PROTECTED_PREFIXES = ["/dashboard", "/invoices", "/customers", "/settings", "/onboarding"];

// Browsers normalize backslashes to forward slashes when resolving a
// relative reference against an http(s) base, so "/\evil.com" would
// otherwise slip past the "//" check and resolve to a protocol-relative
// off-site redirect ("//evil.com").
export function isSafeRelativePath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}

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
