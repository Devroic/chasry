import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { BackLink } from "@/components/dashboard/back-link";
import { getOptionalUser, getProfile } from "@/lib/auth";
import { FREE_INVOICE_LIMIT, PRO_PRICE_AMOUNT } from "@/lib/plan";

const SUPPORT_EMAIL = "info@chasry.com";

export const metadata = { title: "Help" };

// Public page, but signed-in visitors get the full dashboard shell instead of the marketing header.
export default async function HelpPage() {
  const t = await getTranslations("help");
  const tCommon = await getTranslations("common");
  const faqs = (t.raw("faqs") as { question: string; answer: string }[]).map((faq) => ({
    question: faq.question,
    answer: faq.answer
      .replace("{limit}", String(FREE_INVOICE_LIMIT))
      .replace("{price}", PRO_PRICE_AMOUNT),
  }));

  const user = await getOptionalUser();
  const profile = user ? await getProfile(user.id) : null;
  const inApp = Boolean(profile?.onboarded_at);

  const content = (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(13,13,13,0.04),0_12px_32px_-16px_rgba(13,13,13,0.12)]">
        {faqs.map((faq) => (
          <div key={faq.question} className="p-6">
            <h2 className="text-sm font-semibold text-foreground">{faq.question}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-brand-primary-tint p-6 text-center">
        <h2 className="text-sm font-semibold text-foreground">{t("stillStuck")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("emailUs")}</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-4 inline-block text-sm font-medium text-brand-primary hover:underline"
        >
          {SUPPORT_EMAIL}
        </a>
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
        <div className="max-w-2xl">
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
        <BackLink href="/" label={tCommon("back")} className="ml-0 mb-6" useBrowserBack />
        <div className="mx-auto max-w-2xl">{content}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
