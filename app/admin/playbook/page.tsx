import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Playbook" };

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
      {children}
    </code>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

export default async function AdminPlaybookPage() {
  const t = await getTranslations("admin.playbook");

  const kbd = { kbd: (chunks: React.ReactNode) => <Kbd>{chunks}</Kbd> };
  const strong = { strong: (chunks: React.ReactNode) => <strong className="text-foreground">{chunks}</strong> };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.rich("intro", {
            stripeLink: (chunks) => (
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-primary hover:underline"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>

      <Section title={t("cancelTitle")}>
        <p>{t.rich("cancelP1", kbd)}</p>
        <p>{t("cancelP2")}</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>{t("cancelStep1")}</li>
          <li>{t.rich("cancelStep2", strong)}</li>
        </ol>
        <p>{t("cancelP3")}</p>
      </Section>

      <Section title={t("pauseTitle")}>
        <p className="font-medium text-foreground">{t("pauseWarning")}</p>
        <p>{t("pauseP1")}</p>
        <p>{t.rich("pauseP2", kbd)}</p>
      </Section>

      <Section title={t("extendTitle")}>
        <p className="font-medium text-foreground">{t("extendWarning")}</p>
        <p>{t("extendP1")}</p>
      </Section>

      <Section title={t("giftTitle")}>
        <p className="font-medium text-foreground">{t("giftBest")}</p>
        <p>{t.rich("giftP1", kbd)}</p>
        <p className="font-medium text-foreground">{t("giftHandsOff")}</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            {t.rich("giftStep1", {
              userLink: (chunks) => (
                <Link href="/admin/users" className="text-brand-primary hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </li>
          <li>{t("giftStep2")}</li>
        </ol>
        <p>{t("giftP2")}</p>
      </Section>

      <Section title={t("refundsTitle")}>
        <p>{t("refundsP1")}</p>
      </Section>

      <Section title={t("otherTitle")}>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("otherItem1")}</li>
          <li>{t("otherItem2")}</li>
          <li>{t("otherItem3")}</li>
          <li>{t("otherItem4")}</li>
        </ul>
      </Section>
    </div>
  );
}
