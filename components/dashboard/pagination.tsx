import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { LinkPendingIcon } from "@/components/dashboard/link-pending-icon";
import { cn } from "@/lib/utils";

type PageItem = number | "ellipsis";

// First page, last page, current page ± 1, "…" filling any gap (e.g. 1 … 4 5 [6] 7 8 … 12).
function getPageItems(current: number, total: number): PageItem[] {
  const neighbours: number[] = [];
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    neighbours.push(i);
  }
  const items: PageItem[] = [1];
  if (neighbours[0] > 2) items.push("ellipsis");
  items.push(...neighbours);
  if (neighbours[neighbours.length - 1] < total - 1) items.push("ellipsis");
  if (total > 1) items.push(total);
  return items;
}

export function Pagination({
  page,
  totalPages,
  navLabel,
  previousLabel,
  nextLabel,
  buildHref,
}: {
  page: number;
  totalPages: number;
  navLabel: string;
  previousLabel: string;
  nextLabel: string;
  buildHref: (page: number) => string;
}) {
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;
  const items = getPageItems(page, totalPages);

  return (
    <nav aria-label={navLabel} className="mt-4 flex items-center justify-center gap-1">
      {hasPrevious ? (
        <Button variant="outline" size="icon-sm" asChild aria-label={previousLabel}>
          <Link href={buildHref(page - 1)} prefetch={false}>
            <LinkPendingIcon>
              <ChevronLeft />
            </LinkPendingIcon>
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="icon-sm" disabled aria-label={previousLabel}>
          <ChevronLeft />
        </Button>
      )}

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden="true"
            className="px-1 text-sm text-muted-foreground"
          >
            …
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            className={cn(buttonVariants({ variant: "default", size: "icon-sm" }), "cursor-default")}
          >
            {item}
          </span>
        ) : (
          <Button key={item} variant="outline" size="icon-sm" asChild>
            <Link href={buildHref(item)} prefetch={false}>
              <LinkPendingIcon className="size-3.5">{item}</LinkPendingIcon>
            </Link>
          </Button>
        )
      )}

      {hasNext ? (
        <Button variant="outline" size="icon-sm" asChild aria-label={nextLabel}>
          <Link href={buildHref(page + 1)} prefetch={false}>
            <LinkPendingIcon>
              <ChevronRight />
            </LinkPendingIcon>
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="icon-sm" disabled aria-label={nextLabel}>
          <ChevronRight />
        </Button>
      )}
    </nav>
  );
}
