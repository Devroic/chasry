import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  /** Extends the default `mb-4` — public pages with a large h1 right below
   *  need more room than the dashboard's smaller PageHeader titles do. */
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <ChevronLeft className="size-4" /> {label}
    </Link>
  );
}
