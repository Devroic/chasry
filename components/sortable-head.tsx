import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { LinkPendingIcon } from "@/components/link-pending-icon";
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
        prefetch={false}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
        <LinkPendingIcon className="size-3.5">
          <Icon className="size-3.5" />
        </LinkPendingIcon>
      </Link>
    </TableHead>
  );
}
