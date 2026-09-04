"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { BlockingOverlay } from "@/components/blocking-overlay";

/**
 * Submit button that spins while its enclosing form's action runs, for plain forms that don't use
 * useActionState. Must render inside the <form>, since useFormStatus reads its context.
 */
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
