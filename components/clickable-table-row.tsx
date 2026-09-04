"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Row where the whole row (cell padding included) navigates; per-cell <Link> only covers the text. */
export function ClickableTableRow({
  href,
  label,
  className,
  children,
}: {
  href: string;
  /** Accessible name for the row-as-link, e.g. the client or invoice it opens. */
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <TableRow
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        // Space too, not just Enter; preventDefault stops the page scroll.
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      tabIndex={0}
      // Without a role, AT announces a plain table row with no hint it's interactive.
      role="link"
      aria-label={label}
      className={cn(
        "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      {children}
    </TableRow>
  );
}
