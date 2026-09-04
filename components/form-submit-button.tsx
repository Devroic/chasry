"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { BlockingOverlay } from "@/components/blocking-overlay";

/** Spins while the enclosing form's action runs; must render inside the <form> (useFormStatus). */
export function FormSubmitButton({
  blockUi = false,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "type" | "loading"> & {
  /** Overlay the whole page while pending — for waits that end in a redirect. */
  blockUi?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      {/* Quiet shield: the button's own spinner is the indicator. */}
      {blockUi && <BlockingOverlay show={pending} spinner={false} />}
      <Button type="submit" loading={pending} {...props}>
        {children}
      </Button>
    </>
  );
}
