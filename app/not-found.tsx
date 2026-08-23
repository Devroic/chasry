import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-brand-secondary-tint/40">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <Image
          src="/brand/mascot.png"
          alt=""
          width={200}
          height={200}
          className="mb-6 w-28"
          priority
        />
        <span className="rounded-full bg-brand-primary-tint px-4 py-1.5 text-xs font-bold tracking-wide text-brand-primary uppercase">
          {t("eyebrow")}
        </span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground">{t("subtitle")}</p>
        <Button asChild className="mt-8 h-11 px-6 text-base font-semibold">
          <Link href="/">{t("cta")}</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
