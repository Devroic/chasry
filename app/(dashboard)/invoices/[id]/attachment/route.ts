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

  // Header values must be ASCII: Greek filenames go in the RFC 5987 filename*
  // parameter (percent-encoded UTF-8) with an ASCII fallback, or undici throws
  // while building the response and the download 500s.
  const asciiFallback =
    invoice.attachment_filename.replace(/["\\\r\n]/g, "").replace(/[^\x20-\x7e]/g, "_") ||
    "attachment.pdf";
  const utf8Name = encodeURIComponent(invoice.attachment_filename.replace(/[\r\n"]/g, ""));

  return new NextResponse(new Uint8Array(decodeBytea(invoice.attachment_data)), {
    headers: {
      "Content-Type": invoice.attachment_content_type ?? "application/pdf",
      "Content-Disposition": `inline; filename="${asciiFallback}"; filename*=UTF-8''${utf8Name}`,
      // Client/invoice PII shouldn't linger in a shared machine's disk
      // cache or a proxy's cache once the session ends.
      "Cache-Control": "private, no-store",
    },
  });
}
