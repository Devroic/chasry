"use client";

import { BlockingOverlay } from "@/components/blocking-overlay";

// Explicit `show` prop, not useFormStatus — the trigger lives in a DropdownMenuItem
// that unmounts on click, before logout finishes.
export function LogoutPendingOverlay({ show }: { show: boolean }) {
  return <BlockingOverlay show={show} />;
}
