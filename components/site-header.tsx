import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

/**
 * Slim sticky header used on every page outside the authenticated dashboard
 * (auth, onboarding, 404) — mirrors chasry.com's actual header: logo lockup
 * on the left, nothing else competing for attention. Logo height (`h-14`,
 * 56px on sm+) matches chasry.com's own header logo pixel-for-pixel
 * (measured via computed styles on the live site — its icon renders at
 * 56px tall in an 85px header), not guessed.
 */
export function SiteHeader({ actions }: { actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border/70 bg-background/85 backdrop-blur-sm">
      <div className="flex h-20 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <BrandLogo />
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          {actions}
        </div>
      </div>
    </header>
  );
}
