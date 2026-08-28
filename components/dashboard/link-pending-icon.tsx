"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Swaps its children for a spinner while the enclosing <Link> navigates.
// Must be a descendant of <Link> — useLinkStatus reads context it provides.
export function LinkPendingIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useLinkStatus();
  if (pending) return <Loader2 className={cn("animate-spin", className)} aria-hidden="true" />;
  return children;
}
