import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { BackLink } from "@/components/dashboard/back-link";
import { getOptionalUser, getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Privacy Policy" };

const SUPPORT_EMAIL = "info@chasry.com";
const LAST_UPDATED = "August 29, 2026";

// Same reasoning as app/terms/page.tsx: deliberately English-only body text.
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

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ standalone?: string }>;
}) {
  // Same reasoning as /help and /terms: a signed-in, fully onboarded visitor
  // gets the real dashboard chrome instead of the marketing header.
  const user = await getOptionalUser();
  const profile = user ? await getProfile(user.id) : null;
  const inApp = Boolean(profile?.onboarded_at);
  const tCommon = await getTranslations("common");
  // Opened via ?standalone=1 (the "Privacy" link on the signup checkbox,
  // target="_blank"): a fresh tab with no history of its own, so a Back
  // link would have nowhere sensible to go.
  const { standalone } = await searchParams;

  const content = (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(13,13,13,0.04),0_12px_32px_-16px_rgba(13,13,13,0.12)] sm:p-8">
            <Section title="1. Who this policy covers">
              <p>
                This policy explains what personal data Chasry (&quot;we&quot;, &quot;us&quot;)
                collects and why, both from you, if you have a Chasry account, and about your
                clients, whose details you enter into Chasry so we can send them payment reminders
                on your behalf.
              </p>
            </Section>

            <Section title="2. Data we collect from you">
              <p>When you create a Chasry account, we collect:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Your business name and email address,</li>
                <li>Your password, stored securely by our authentication provider (we never see it in plain text),</li>
                <li>Your currency preference, and your language and theme choices,</li>
                <li>Your subscription status and Stripe customer and subscription identifiers, once you upgrade to Pro,</li>
                <li>The date and time you accepted these Terms and this Privacy Policy,</li>
                <li>Basic technical data (like error reports) that helps us keep the service working.</li>
              </ul>
            </Section>

            <Section title="3. Data you enter about your clients">
              <p>
                To send reminders on your behalf, you give us your client&apos;s name, email
                address, and optionally their phone number, along with the invoice details you log
                (amount, due date, invoice number, notes, and a payment link if you set one). We
                collect this because you enter it, not directly from your clients themselves.
              </p>
              <p>
                If you attach a file to an invoice (for example, a PDF), Pro plan only, we store
                that file so it can be included with your reminder emails. It may contain your
                client&apos;s own details if you&apos;ve included them in it, that&apos;s your
                content, we just store and send it on your behalf.
              </p>
              <p>
                For this client data, you are responsible for having a lawful reason to contact your
                own clients about their own invoices. We process it only to provide the reminder
                service you&apos;ve asked for.
              </p>
            </Section>

            <Section title="4. How we use this data">
              <p>We use the data above to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Create and run your account,</li>
                <li>Generate and send reminder emails to your clients on your behalf, on the schedule you&apos;ve set,</li>
                <li>Enforce the free plan&apos;s invoice limit,</li>
                <li>Process your Pro subscription payment,</li>
                <li>Respond to support requests you send us,</li>
                <li>Monitor for and fix errors, and prevent abuse of the service.</li>
              </ul>
              <p>
                We do not sell your data or your clients&apos; data to anyone, and we do not use it
                for advertising.
              </p>
            </Section>

            <Section title="5. Who we share data with">
              <p>
                We use a small number of service providers to run Chasry, each only for the purpose
                described:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Supabase, for our database and account authentication,</li>
                <li>Stripe, to process your Pro subscription payment (Stripe never receives your clients&apos; invoice or contact details, only your own billing information),</li>
                <li>Resend, to deliver account emails and the reminder emails we send to your clients on your behalf,</li>
                <li>Sentry, for error monitoring. We keep what we send it minimal, for example an invoice ID, never your client&apos;s email address or the invoice amount,</li>
                <li>Vercel, to host the application.</li>
              </ul>
              <p>
                Separately, a small number of authorized Chasry staff can access account data,
                yours and, where necessary to help you, your clients&apos; contact and invoice
                details you&apos;ve entered, to provide support, investigate abuse, or keep the
                service running. That access is limited to what&apos;s needed for those purposes.
              </p>
            </Section>

            <Section title="6. Where data is processed">
              <p>
                Our service providers may process and store data in the European Union and/or the
                United States, each under their own data protection commitments.
              </p>
            </Section>

            <Section title="7. Cookies and local storage">
              <p>Chasry uses:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>A session cookie that keeps you signed in. This is required for the app to work,</li>
                <li>A cookie that remembers your chosen language,</li>
                <li>Your light/dark theme preference, stored in your browser (not a cookie).</li>
              </ul>
              <p>We don&apos;t use advertising or analytics tracking cookies.</p>
            </Section>

            <Section title="8. How long we keep data">
              <p>
                We keep your data for as long as your account is active. You can permanently delete
                your account at any time from Settings, which removes your profile, your clients,
                your invoices, and your reminder history, and cancels any active subscription.
              </p>
            </Section>

            <Section title="9. Your rights">
              <p>
                Depending on where you live, you may have the right to access, correct, export, or
                delete your personal data. Most of this is already available directly in Settings.
                For anything else, email us at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-primary hover:underline">
                  {SUPPORT_EMAIL}
                </a>
                . If you received a reminder email from a Chasry user and want your details removed,
                the business who sent it is responsible for that data since they entered it, but you
                can also contact us and we&apos;ll help.
              </p>
            </Section>

            <Section title="10. Children">
              <p>Chasry is not directed at, and must not be used by, anyone under 18.</p>
            </Section>

            <Section title="11. Changes to this policy">
              <p>
                We may update this policy from time to time. We&apos;ll update the &quot;last
                updated&quot; date above, and for material changes, we&apos;ll try to notify account
                holders by email.
              </p>
            </Section>

            <Section title="12. Contact">
              <p>
                Questions about this policy? Email us at{" "}
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
        <div className="max-w-3xl">
          <BackLink href="/dashboard" label={tCommon("back")} useBrowserBack />
          {content}
        </div>
      </DashboardShell>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-brand-secondary-tint/40">
      <SiteHeader />
      <main className="flex-1 px-6 py-10">
        {!standalone && (
          <BackLink href="/" label={tCommon("back")} className="ml-0 mb-6" useBrowserBack />
        )}
        <div className="mx-auto max-w-3xl">{content}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
