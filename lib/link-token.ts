import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, expiring, single-purpose invoice links for emails. The token is the entire credential,
 * so links go only to the intended recipient. Requires LINK_SIGNING_SECRET; when unset, signing
 * is disabled and callers must omit the links rather than fall back to a derived secret.
 */

export type LinkPurpose = "claim-paid" | "mark-paid";

function secret() {
  return process.env.LINK_SIGNING_SECRET ?? "";
}

export function linkTokensEnabled() {
  return secret().length >= 32;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signInvoiceLink(purpose: LinkPurpose, invoiceId: string, expiresInDays: number) {
  if (!linkTokensEnabled()) throw new Error("LINK_SIGNING_SECRET is not configured");
  const expiresAtMs = Date.now() + expiresInDays * 86_400_000;
  const payload = `${purpose}|${invoiceId}|${expiresAtMs}`;
  return `${Buffer.from(payload).toString("base64url")}.${signature(payload)}`;
}

/** Returns the invoice id, or null for anything malformed, forged, expired, or wrong-purpose. */
export function verifyInvoiceLink(purpose: LinkPurpose, token: string): string | null {
  if (!linkTokensEnabled()) return null;
  // Length cap so a hostile query string can't feed unbounded input into decode/HMAC.
  if (typeof token !== "string" || token.length > 512) return null;

  const [encodedPayload, providedSig] = token.split(".");
  if (!encodedPayload || !providedSig) return null;

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expectedSig = signature(payload);
  const providedBuf = Buffer.from(providedSig);
  const expectedBuf = Buffer.from(expectedSig);
  // Hard rule: secret-derived comparisons are timing-safe, never `===`.
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return null;
  }

  const [tokenPurpose, invoiceId, expiresAtMs] = payload.split("|");
  if (tokenPurpose !== purpose || !invoiceId) return null;
  if (!Number.isFinite(Number(expiresAtMs)) || Date.now() > Number(expiresAtMs)) return null;

  return invoiceId;
}
