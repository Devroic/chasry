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
  /** Overrides the default `mb-4`. */
  className?: string;
  /** Returns to the previous page instead of always going to `href`. */
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
        // -ml-5 hangs the icon left so the label aligns with the title below.
        "-ml-5 mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <ChevronLeft className="size-4" /> {label}
    </Link>
  );
}
