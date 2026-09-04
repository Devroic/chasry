import type { Metadata } from "next";
import { SitePageShell } from "@/components/site-page-shell";
import { LegalSection as Section } from "@/components/legal-section";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { FREE_INVOICE_LIMIT, PRO_PRICE_LABEL } from "@/lib/plan";

export const metadata: Metadata = { title: "Terms of Service" };

const LAST_UPDATED = "August 31, 2026";

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ standalone?: string }>;
}) {
  // ?standalone=1: opened in a fresh tab (signup checkbox link), so no Back link.
  const { standalone } = await searchParams;

  const content = (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
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

            <Section title="4. Automated actions taken on your instructions">
              <p>
                Some Chasry features act automatically on standing instructions you give: scheduled
                reminders send without further confirmation, repeating invoices create the next
                invoice in a series on your behalf, and reminder emails can offer your client a
                link to tell you they&apos;ve already paid. Each of these runs only because you
                turned it on, and you can turn each one off at any time.
              </p>
              <p>
                When you mark an invoice as repeating, you authorize Chasry to create the next
                invoice in the series using the details of the previous one (client, amount,
                currency, notes, payment link, and reminder settings). We notify you by email each
                time this happens. You are responsible for reviewing each created invoice, for
                keeping the series&apos; details accurate, for attaching any documents the new
                invoice needs (attachments are never copied automatically), and for stopping the
                series when it should end.
              </p>
              <p>
                When a client uses the &quot;already paid&quot; link in a reminder, Chasry records
                their confirmation, pauses reminders for that invoice, and notifies you. We do not
                and cannot verify whether payment was actually made. Deciding whether to mark the
                invoice as paid, or to resume reminders, is entirely your responsibility.
              </p>
              <p>
                Summary and notification emails (for example, the weekly summary) are provided for
                convenience only. They are not a statement of account or a system of record, and
                you remain responsible for tracking your own invoices and payments.
              </p>
            </Section>

            <Section title="5. Acceptable use">
              <p>You agree to use Chasry only to send reminders about invoices you&apos;re genuinely owed by your own clients. In particular, you agree not to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Use Chasry to send reminders for invoices that don&apos;t exist or aren&apos;t genuinely owed to you,</li>
                <li>Use Chasry to harass, threaten, or mislead the people you&apos;re invoicing,</li>
                <li>
                  Use repeating invoices to bill for amounts that aren&apos;t genuinely recurring
                  and owed under your arrangement with the client,
                </li>
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

            <Section title="6. Payments">
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

            <Section title="7. Your data">
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

            <Section title="8. Service availability">
              <p>
                We aim to keep Chasry reliable and available, but we don&apos;t guarantee
                uninterrupted access. We may perform maintenance, and features may change as we
                improve the product. We&apos;ll try to give notice of any change that meaningfully
                affects how you use Chasry.
              </p>
            </Section>

            <Section title="9. Limitation of liability">
              <p>
                Chasry is provided &quot;as is&quot; and &quot;as available&quot;, without
                warranties of any kind, express or implied, including any warranty of
                merchantability, fitness for a particular purpose, or non-infringement, to the
                extent permitted by law.
              </p>
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
                accuracy of the client contact details you provide. This includes invoices Chasry
                creates automatically on your standing instructions (repeating invoices). We&apos;re
                not liable for how a client responds to, or any dispute arising from, a reminder,
                invoice, or attachment sent or created using information, settings, or files you
                supplied.
              </p>
              <p>
                We&apos;re also not liable for a client&apos;s &quot;already paid&quot; confirmation
                being inaccurate or dishonest, for reminders paused or resumed as a result of such a
                confirmation or of your snooze settings, or for any decision you make in reliance on
                a notification or summary email. Email delivery depends on networks and mail
                providers outside our control, so we can&apos;t guarantee that any particular email
                is delivered, read, or not filtered as spam.
              </p>
            </Section>

            <Section title="10. Indemnification">
              <p>
                You agree to defend, indemnify, and hold Chasry harmless from any claim, demand,
                loss, or expense, including reasonable legal fees, arising from your use of
                Chasry, the invoices, reminders, or file attachments you send through it, the
                invoices Chasry creates on your standing instructions, or any dispute between you
                and your own clients, including disputes about whether an invoice was owed, paid,
                or correctly billed. This includes claims brought against us by your clients or by
                other third parties as a result of how you used the service.
              </p>
            </Section>

            <Section title="11. Ending your account">
              <p>
                You can delete your account at any time from Settings &rsaquo; Profile. This cancels
                any active subscription and permanently removes your account, your clients, your
                invoices, and your reminder history. We may suspend or close accounts that violate
                these Terms.
              </p>
            </Section>

            <Section title="12. Changes to these terms">
              <p>
                We may update these Terms from time to time. We&apos;ll update the &quot;last
                updated&quot; date above, and for material changes, we&apos;ll try to notify you by
                email. Continuing to use Chasry after a change means you accept the updated Terms.
              </p>
            </Section>

            <Section title="13. Governing law">
              <p>These Terms are governed by the laws of Cyprus, without regard to conflict-of-law principles.</p>
            </Section>

            <Section title="14. Contact">
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

  return (
    <SitePageShell maxWidthClassName="max-w-3xl" hideBackLink={Boolean(standalone)}>
      {content}
    </SitePageShell>
  );
}
