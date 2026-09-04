"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * A table row where the entire row (including cell padding, not just its
 * text) navigates on click — a plain per-cell `<Link>` only makes the text
 * itself clickable, leaving the row visually clickable-looking but not
 * actually clickable everywhere.
 */
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
        // Space too, not just Enter — it's the other activation key users
        // expect on a focusable row (preventDefault stops the page scroll).
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
