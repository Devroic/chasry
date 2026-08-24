import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Bell, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { FREE_INVOICE_LIMIT, PRO_PRICE_LABEL } from "@/lib/plan";

const FEATURE_ICONS = [Bell, Clock, ShieldCheck];

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const t = await getTranslations("landing");
  const tAuth = await getTranslations("auth.signup");

  const features = [1, 2, 3].map((n) => ({
    Icon: FEATURE_ICONS[n - 1],
    title: t(`feature${n}Title` as "feature1Title"),
    description: t(`feature${n}Description` as "feature1Description"),
  }));

  const steps = [1, 2, 3].map((n) => ({
    number: t(`step${n}Number` as "step1Number"),
    title: t(`step${n}Title` as "step1Title"),
    description: t(`step${n}Description` as "step1Description"),
  }));

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-brand-secondary-tint/40">
      <SiteHeader
        actions={
          <Button variant="ghost" size="sm" asChild className="ml-1">
            <Link href="/login">{t("heroCtaSecondary")}</Link>
          </Button>
        }
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 text-center lg:flex-row lg:gap-16 lg:text-left">
            <div className="flex-1">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                {t("heroTitle")}
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">{t("heroSubtitle")}</p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <Button asChild className="h-11 w-full px-6 text-base font-semibold sm:w-auto">
                  <Link href="/signup">
                    {t("heroCtaPrimary")} <ArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 w-full px-6 text-base font-semibold sm:w-auto"
                >
                  <Link href="/login">{t("heroCtaSecondary")}</Link>
                </Button>
              </div>
            </div>
            <div className="relative flex-1">
              {/*
               * The mascot is drawn holding a solid-white envelope, which
               * reads fine straight on light mode's near-white page but
               * looked like a stray white shape sitting directly on dark
               * mode's near-black background. A fixed light glow behind him
               * (not theme-aware on purpose, its only job is giving the
               * white parts of the artwork a surface to sit on) fixes dark
               * mode and is only a barely-visible halo in light mode.
               */}
              <div
                aria-hidden
                className="absolute inset-8 -z-10 rounded-full bg-[#eef4fc] blur-3xl sm:inset-12"
              />
              <Image
                src="/brand/mascot.png"
                alt=""
                width={420}
                height={430}
                className="relative mx-auto w-56 sm:w-72 lg:w-80"
                priority
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("featuresTitle")}
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {features.map(({ Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(13,13,13,0.04),0_12px_32px_-16px_rgba(13,13,13,0.12)]"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-brand-primary-tint text-brand-primary">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-12">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("stepsTitle")}
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {steps.map(({ number, title, description }) => (
                <div key={number} className="text-center sm:text-left">
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white">
                    {number}
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-6 py-12">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("pricingTitle")}
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {t("pricingSubtitle")}
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-8">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  {t("freeTitle")}
                </h3>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-foreground">
                    {t("freePrice")}
                  </span>
                  <span className="text-sm text-muted-foreground">{t("freePricePeriod")}</span>
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("freeDescription", { limit: FREE_INVOICE_LIMIT })}
                </p>
                <Button asChild variant="outline" className="mt-6 w-full">
                  <Link href="/signup">{t("freeCta")}</Link>
                </Button>
              </div>

              <div className="rounded-2xl border-2 border-brand-primary bg-card p-8">
                <h3 className="text-sm font-semibold text-brand-primary uppercase">
                  {t("proTitle")}
                </h3>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-foreground">
                    {PRO_PRICE_LABEL.split("/")[0]}
                  </span>
                  <span className="text-sm text-muted-foreground">{t("proPricePeriod")}</span>
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{t("proDescription")}</p>
                {/*
                 * No second signup button here on purpose. Both plans lead
                 * to the same /signup flow (there's no plan picker at
                 * signup), so a Pro-labeled button next to the Free one
                 * would do the exact same thing under a different label,
                 * which reads as broken rather than as a choice.
                 */}
                <p className="mt-6 text-center text-xs text-muted-foreground">{t("proNote")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-2xl rounded-2xl bg-brand-primary-tint p-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("finalCtaTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("finalCtaSubtitle")}</p>
            <Button asChild className="mt-6 h-11 px-6 text-base font-semibold">
              <Link href="/signup">
                {t("finalCtaButton")} <ArrowRight />
              </Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              {tAuth("alreadyHaveAccount")}{" "}
              <Link href="/login" className="font-medium text-brand-primary hover:underline">
                {tAuth("logIn")}
              </Link>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
