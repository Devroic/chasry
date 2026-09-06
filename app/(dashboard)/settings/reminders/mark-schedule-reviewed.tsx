"use client";

import { useEffect, useRef } from "react";
import { markScheduleReviewed } from "./actions";

/** Fire-once on mount: opening this page counts as reviewing the reminder schedule. */
export function MarkScheduleReviewed({ reviewed }: { reviewed: boolean }) {
  const fired = useRef(false);

  useEffect(() => {
    if (reviewed || fired.current) return;
    fired.current = true;
    markScheduleReviewed();
  }, [reviewed]);

  return null;
}
