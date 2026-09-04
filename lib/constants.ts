/** Support address shown in the footer, help, legal pages, and account emails. */
export const SUPPORT_EMAIL = "support@chasry.com";

/** Absolute origin for email links and Stripe redirects; falls back to localhost for dev. */
export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
