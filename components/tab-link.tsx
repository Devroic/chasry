import Link from "next/link";
import { cn } from "@/lib/utils";

/** Underline-style tab link, shared by the settings tabs, invoice filters, and admin mobile nav. */
export function TabLink({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        // No inline pending spinner: every tab surface has a content-level loading boundary.
        "inline-flex items-center border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-brand-primary text-brand-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </Link>
  );
}
