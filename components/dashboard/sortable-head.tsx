import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function SortableHead({
  label,
  active,
  dir,
  href,
  className,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  href: string;
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead className={className}>
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
        <Icon className="size-3.5" />
      </Link>
    </TableHead>
  );
}
