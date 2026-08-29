"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackLink({
  href,
  label,
  className,
  useBrowserBack = false,
}: {
  href: string;
  label: string;
  /** Extends the default `mb-4` — public pages with a large h1 right below
   *  need more room than the dashboard's smaller PageHeader titles do. */
  className?: string;
  /** For pages reachable from many different contexts (help/terms/privacy,
   *  linked from login, signup, the homepage, etc.): return to wherever the
   *  visitor actually came from instead of always going to `href`. `href`
   *  stays as the fallback when there's no previous page in this tab's
   *  history (e.g. a direct link). */
  useBrowserBack?: boolean;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (useBrowserBack && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className={cn(
        "mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <ChevronLeft className="size-4" /> {label}
    </Link>
  );
}
