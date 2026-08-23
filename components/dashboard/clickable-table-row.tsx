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
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <TableRow
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      tabIndex={0}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </TableRow>
  );
}
