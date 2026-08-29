import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { BackLink } from "@/components/dashboard/back-link";
import { getOptionalUser, getProfile } from "@/lib/auth";
import { FREE_INVOICE_LIMIT, PRO_PRICE_LABEL } from "@/lib/plan";

export const metadata: Metadata = { title: "Terms of Service" };

const SUPPORT_EMAIL = "info@chasry.com";
const LAST_UPDATED = "August 28, 2026";

// Deliberately not run through next-intl — see the i18n section of
// ARCHITECTURE.md: legal text carries real risk if a translation gets a
// term subtly wrong, and the app already accepts partial i18n coverage
// elsewhere (Server Action errors) for the same reason. Chrome around this
// page (header, footer, the Back label) stays translated as normal.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ standalone?: string }>;
}) {
  // Same reasoning as /help: a signed-in visitor gets the real dashboard
  // chrome instead of the marketing header, so opening this from inside the
  // app doesn't feel like being dropped outside it. Only a *finished*
  // account gets the shell — a half-onboarded user would get nav links that
  // just bounce them back to /onboarding.
  const user = await getOptionalUser();
  const profile = user ? await getProfile(user.id) : null;
  const inApp = Boolean(profile?.onboarded_at);
  const tCommon = await getTranslations("common");
  // Opened via ?standalone=1 (the "Terms" link on the signup checkbox,
  // target="_blank"): a fresh tab with no history of its own, so a Back
  // link would have nowhere sensible to go.
  const { standalone } = await searchParams;

  const content = (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(13,13,13,0.04),0_12px_32px_-16px_rgba(13,13,13,0.12)] sm:p-8">
            <Section title="1. Agreement to these terms">
              <p>
                These Terms of Service (&quot;Terms&quot;) govern your use of Chasry (&quot;Chasry&quot;,
                &quot;we&quot;, &quot;us&quot;), a web application that helps freelancers and small
                businesses log unpaid invoices and automatically send payment reminders to their
                clients. By creating an account or using Chasry, you agree to these Terms. If you
                don&apos;t agree, please don&apos;t use the service.
              </p>
            </Section>

            <Section title="2. Your account">
              <p>
                You need an account to use Chasry. You&apos;re responsible for keeping your login
                credentials secure and for everything that happens under your account. You must
                provide accurate information when signing up, and you must be at least 18 years old
                to use Chasry.
              </p>
            </Section>

            <Section title="3. The service and plans">
              <p>
                Chasry is offered on a free plan, capped at {FREE_INVOICE_LIMIT} active (unpaid)
                invoices at a time, and a paid Pro plan at {PRO_PRICE_LABEL}, billed through Stripe,
                which removes that limit. There&apos;s no separate trial period, since the free plan
                already lets you use the full product before paying for anything.
              </p>
              <p>
                Pro subscriptions renew automatically each billing period until you cancel. You can
                cancel anytime from Settings &rsaquo; Billing, and you&apos;ll keep Pro access until
                the end of the period you&apos;ve already paid for. We don&apos;t offer refunds for
                partial billing periods, except where required by law.
              </p>
            </Section>

            <Section title="4. Acceptable use">
              <p>You agree to use Chasry only to send reminders about invoices you&apos;re genuinely owed by your own clients. In particular, you agree not to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Use Chasry to send reminders for invoices that don&apos;t exist or aren&apos;t genuinely owed to you,</li>
                <li>Use Chasry to harass, threaten, or mislead the people you&apos;re invoicing,</li>
                <li>
                  Send reminders that don&apos;t comply with the laws that apply to you and your
                  clients (for example, rules on debt collection communications in your
                  jurisdiction). Chasry provides the tool, but you&apos;re responsible for how you
                  use it,
                </li>
                <li>
                  Attach files to your invoices (for example, PDFs) that are unlawful, infringing,
                  or that you don&apos;t have the right to send to your clients,
                </li>
                <li>Attempt to disrupt, reverse-engineer, or gain unauthorized access to Chasry or other users&apos; accounts.</li>
              </ul>
              <p>
                We may suspend or terminate accounts that violate this section, with notice where
                practical.
              </p>
            </Section>

            <Section title="5. Payments">
              <p>
                All payments are processed by Stripe. Chasry never receives or stores your card
                details. Prices are shown to you before you pay and include or exclude tax as
                displayed at checkout.
              </p>
              <p>
                Chasry never touches the money your clients owe you. Reminder emails can include a
                &quot;Pay now&quot; link pointing to a payment page you set up yourself (a Stripe
                Payment Link, PayPal.me, or similar). Your client pays you directly, and Chasry has
                no visibility into or involvement in that transaction.
              </p>
            </Section>

            <Section title="6. Your data">
              <p>
                You own the client and invoice information you enter into Chasry. We process it
                solely to provide the service to you, as described in our{" "}
                <a href="/privacy" className="text-brand-primary hover:underline">
                  Privacy Policy
                </a>
                . You&apos;re responsible for the accuracy of the information you enter and for
                having the right to contact the people you add as clients about their invoices.
              </p>
            </Section>

            <Section title="7. Service availability">
              <p>
                We aim to keep Chasry reliable and available, but we don&apos;t guarantee
                uninterrupted access. We may perform maintenance, and features may change as we
                improve the product. We&apos;ll try to give notice of any change that meaningfully
                affects how you use Chasry.
              </p>
            </Section>

            <Section title="8. Limitation of liability">
              <p>
                Chasry is a reminder tool, not a debt collection or legal service. We&apos;re not
                liable for unpaid invoices, disputes between you and your clients, or your inability
                to collect payment. To the extent permitted by law, our total liability to you for
                any claim relating to Chasry is limited to the amount you paid us in the 12 months
                before the claim arose.
              </p>
              <p>
                You&apos;re solely responsible for the accuracy and content of the invoices,
                reminders, and any file attachments Chasry sends on your behalf, and for the
                accuracy of the client contact details you provide. We&apos;re not liable for how a
                client responds to, or any dispute arising from, a reminder or attachment sent using
                information or files you supplied.
              </p>
            </Section>

            <Section title="9. Indemnification">
              <p>
                You agree to defend, indemnify, and hold Chasry harmless from any claim, demand,
                loss, or expense, including reasonable legal fees, arising from your use of
                Chasry, the invoices, reminders, or file attachments you send through it, or any
                dispute between you and your own clients. This includes claims brought against us
                by your clients or by other third parties as a result of how you used the service.
              </p>
            </Section>

            <Section title="10. Ending your account">
              <p>
                You can delete your account at any time from Settings &rsaquo; Profile. This cancels
                any active subscription and permanently removes your account, your clients, your
                invoices, and your reminder history. We may suspend or close accounts that violate
                these Terms.
              </p>
            </Section>

            <Section title="11. Changes to these terms">
              <p>
                We may update these Terms from time to time. We&apos;ll update the &quot;last
                updated&quot; date above, and for material changes, we&apos;ll try to notify you by
                email. Continuing to use Chasry after a change means you accept the updated Terms.
              </p>
            </Section>

            <Section title="12. Governing law">
              <p>These Terms are governed by the laws of Cyprus, without regard to conflict-of-law principles.</p>
            </Section>

            <Section title="13. Contact">
              <p>
                Questions about these Terms? Email us at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-primary hover:underline">
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </Section>
      </div>
    </>
  );

  if (inApp && profile) {
    return (
      <DashboardShell
        businessName={profile.business_name || profile.email || user?.email || ""}
        email={profile.email ?? user?.email ?? ""}
        subscriptionStatus={profile.subscription_status}
        footer={<SiteFooter />}
      >
        <div className="max-w-3xl">{content}</div>
      </DashboardShell>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-brand-secondary-tint/40">
      <SiteHeader />
      <main className="flex-1 px-6 py-10">
        {!standalone && (
          <BackLink href="/" label={tCommon("back")} className="mb-6" useBrowserBack />
        )}
        <div className="mx-auto max-w-3xl">{content}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
