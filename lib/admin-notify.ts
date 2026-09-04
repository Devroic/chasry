import "server-only";
import { resend, ACCOUNT_FROM_EMAIL } from "@/lib/resend";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c
  );
}

/** Best-effort internal heads-up to the admin inbox(es). Never throws. */
export async function notifyAdmins(subject: string, lines: string[]) {
  if (ADMIN_EMAILS.length === 0) return;
  try {
    await resend.emails.send({
      from: ACCOUNT_FROM_EMAIL,
      to: ADMIN_EMAILS,
      subject,
      html: `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6">${lines
        .map((line) => `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`)
        .join("")}</div>`,
    });
  } catch (err) {
    console.error("admin-notify: send failed", err);
  }
}
