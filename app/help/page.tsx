import { getTranslations } from "next-intl/server";
import { SitePageShell } from "@/components/site-page-shell";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { FREE_INVOICE_LIMIT, PRO_PRICE_AMOUNT } from "@/lib/plan";

export const metadata = { title: "Help" };

export default async function HelpPage() {
  const t = await getTranslations("help");
  const faqs = (t.raw("faqs") as { question: string; answer: string }[]).map((faq) => ({
    question: faq.question,
    answer: faq.answer
      .replace("{limit}", String(FREE_INVOICE_LIMIT))
      .replace("{price}", PRO_PRICE_AMOUNT),
  }));

  const content = (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
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

  return <SitePageShell maxWidthClassName="max-w-2xl">{content}</SitePageShell>;
}
