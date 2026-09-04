import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { decodeBytea } from "@/lib/invoice-attachment";

/** Serves the owner's attached PDF; authenticates itself, never relying on the linking page's guard. */
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

  // Non-ASCII filenames go in the RFC 5987 filename* param with an ASCII fallback, or undici 500s.
  const asciiFallback =
    invoice.attachment_filename.replace(/["\\\r\n]/g, "").replace(/[^\x20-\x7e]/g, "_") ||
    "attachment.pdf";
  const utf8Name = encodeURIComponent(invoice.attachment_filename.replace(/[\r\n"]/g, ""));

  return new NextResponse(new Uint8Array(decodeBytea(invoice.attachment_data)), {
    headers: {
      "Content-Type": invoice.attachment_content_type ?? "application/pdf",
      "Content-Disposition": `inline; filename="${asciiFallback}"; filename*=UTF-8''${utf8Name}`,
      // Invoice PII must not linger in shared-disk or proxy caches.
      "Cache-Control": "private, no-store",
    },
  });
}
