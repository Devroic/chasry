import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Escape hatch for a session with no readable profiles row; RSCs can't sign out (no cookie writes).
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}
