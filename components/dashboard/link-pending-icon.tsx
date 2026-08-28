"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Swaps its children for a spinner while the enclosing `<Link>` is
 * navigating. Must be rendered as a descendant of a `<Link>` — `useLinkStatus`
 * reads pending state from context that `<Link>` provides, so this can't be
 * called from the same component that returns the `<Link>` itself.
 *
 * Table list pages (clients, invoices, admin users) re-render the whole page
 * on every sort/page-change click since it's a `searchParams` change, not a
 * fresh route, so the nearest `loading.tsx` boundary has already resolved and
 * won't show again. This is the officially recommended replacement for that
 * case — see https://nextjs.org/docs/app/api-reference/functions/use-link-status.
 */
export function LinkPendingIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useLinkStatus();
  if (pending) return <Loader2 className={cn("animate-spin", className)} aria-hidden="true" />;
  return children;
}
