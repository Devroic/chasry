"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Fires a success toast whenever a `useActionState` action reports success.
 *
 * Replaces the inline `<Alert>` that used to render above these forms: on a
 * long form the confirmation appeared above the fold, so after scrolling down
 * to the save button you got no visible feedback at all that anything had
 * happened. A toast is anchored to the viewport, so it's seen regardless of
 * scroll position, and it dismisses itself instead of lingering as stale
 * "Saved." text next to fields you've since edited again.
 *
 * Keyed on the state object's *identity*, not the message string —
 * `useActionState` hands back a fresh object on every dispatch, so saving
 * twice in a row with the same message still toasts twice, which a
 * `[message]` dependency would silently swallow.
 */
export function useSuccessToast(state: { success?: string } | null) {
  const lastShown = useRef<object | null>(null);

  useEffect(() => {
    if (!state?.success || lastShown.current === state) return;
    lastShown.current = state;
    toast.success(state.success);
  }, [state]);
}
