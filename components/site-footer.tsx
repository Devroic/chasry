import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { InstagramIcon, FacebookIcon, TiktokIcon } from "@/components/icons/social-icons";
import { SUPPORT_EMAIL } from "@/lib/constants";

const SOCIAL_LINKS = [
  { href: "https://www.instagram.com/chasryapp/", label: "Instagram", Icon: InstagramIcon },
  { href: "https://www.facebook.com/chasryapp", label: "Facebook", Icon: FacebookIcon },
  { href: "https://www.tiktok.com/@chasryapp", label: "TikTok", Icon: TiktokIcon },
];

export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-border/70 px-6 py-8">
      {/* max-w-7xl matches the dashboard content column; wrap keeps long Greek labels from overflowing on phones. */}
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Chasry. {t("rights")}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:text-foreground">
            {t("terms")}
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            {t("privacy")}
          </Link>
          <Link href="/help" className="hover:text-foreground">
            {t("help")}
          </Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-foreground">
            {t("contactUs")}
          </a>
          <div className="flex items-center gap-4">
            {SOCIAL_LINKS.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
