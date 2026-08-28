import "server-only";

const PDF_MAGIC = "%PDF-";
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/**
 * A real content check, not just trusting the browser-reported MIME type
 * or the filename's extension — a renamed .exe with a ".pdf" name would
 * pass either of those. Every real PDF starts with this exact byte
 * sequence, regardless of what it's called or how it was uploaded.
 */
export function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, PDF_MAGIC.length).toString("ascii") === PDF_MAGIC;
}

/**
 * Postgres/PostgREST's wire format for `bytea`: a JSON string holding the
 * hex-encoded bytes prefixed with a literal "\x" (Postgres's own default
 * bytea output format) — verified against a real round trip through
 * supabase-js before wiring this into the rest of the feature, getting
 * this encoding wrong would silently corrupt every uploaded file.
 */
export function encodeBytea(buffer: Buffer): string {
  return `\\x${buffer.toString("hex")}`;
}

export function decodeBytea(value: string): Buffer {
  return Buffer.from(value.slice(2), "hex");
}

/**
 * Shapes an invoice's stored attachment (if any) for Resend's
 * `attachments` param. Takes the already-fetched columns rather than
 * querying itself — every call site already selects the invoice row for
 * other fields (amount, due date, ...), so this just reads three more
 * columns off that same query instead of a second round trip.
 */
export function buildEmailAttachment(invoice: {
  attachment_filename: string | null;
  attachment_content_type: string | null;
  attachment_data: string | null;
}): { filename: string; content: Buffer; contentType?: string }[] | undefined {
  if (!invoice.attachment_data || !invoice.attachment_filename) return undefined;
  return [
    {
      filename: invoice.attachment_filename,
      content: decodeBytea(invoice.attachment_data),
      contentType: invoice.attachment_content_type ?? undefined,
    },
  ];
}
