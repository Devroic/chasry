import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Escape hatch for an authenticated session whose profiles row is missing or
// unreadable. requireOnboardedUser can't sign out itself (server components can't
// write cookies), and redirecting to /login while still authenticated makes the
// middleware bounce straight back to /dashboard, looping forever.
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}
