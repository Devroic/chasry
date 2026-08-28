import "server-only";

const PDF_MAGIC = "%PDF-";
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

// Real content check, not just the MIME type or extension — a renamed .exe would pass either.
export function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, PDF_MAGIC.length).toString("ascii") === PDF_MAGIC;
}

// Postgres/PostgREST's wire format for bytea: hex bytes prefixed with a literal "\x".
export function encodeBytea(buffer: Buffer): string {
  return `\\x${buffer.toString("hex")}`;
}

export function decodeBytea(value: string): Buffer {
  return Buffer.from(value.slice(2), "hex");
}

// Shapes a stored attachment for Resend's `attachments` param. Takes already-fetched
// columns instead of querying itself, avoids a second round trip.
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
