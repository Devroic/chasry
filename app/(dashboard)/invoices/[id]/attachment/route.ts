import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { decodeBytea } from "@/lib/invoice-attachment";

/** Serves an invoice's attached PDF back to its owner — authenticates
 * itself the same as every other Server Action/route in this app, not
 * relying on the page that links here having already checked access. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("attachment_filename, attachment_content_type, attachment_data")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!invoice?.attachment_data || !invoice.attachment_filename) {
    return NextResponse.json({ error: "No attachment" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(decodeBytea(invoice.attachment_data)), {
    headers: {
      "Content-Type": invoice.attachment_content_type ?? "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.attachment_filename.replace(/"/g, "")}"`,
      // Client/invoice PII shouldn't linger in a shared machine's disk
      // cache or a proxy's cache once the session ends.
      "Cache-Control": "private, no-store",
    },
  });
}
