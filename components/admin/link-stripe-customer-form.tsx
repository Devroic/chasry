"use client";

import { useActionState, startTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { linkStripeCustomer, type LinkStripeCustomerState } from "@/app/admin/actions";
import { linkStripeCustomerSchema, type LinkStripeCustomerInput } from "@/lib/validations/admin";
import { toFormData } from "@/lib/utils";

export function LinkStripeCustomerForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<LinkStripeCustomerState, FormData>(
    linkStripeCustomer,
    null
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LinkStripeCustomerInput>({
    resolver: zodResolver(linkStripeCustomerSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { userId, stripeCustomerId: "" },
  });

  const lastShown = useRef<object | null>(null);
  useEffect(() => {
    if (!state?.success || lastShown.current === state) return;
    lastShown.current = state;
    toast.success(state.success);
  }, [state]);

  const onValid = (data: LinkStripeCustomerInput) =>
    startTransition(() => formAction(toFormData(data)));

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-3">
      {state?.error && <p className="text-xs font-medium text-destructive">{state.error}</p>}
      <input type="hidden" {...register("userId")} />
      <FormField
        label="Stripe customer ID"
        htmlFor="stripeCustomerId"
        error={errors.stripeCustomerId?.message}
        hint={errors.stripeCustomerId ? undefined : "Link this before creating a subscription for them in Stripe, the webhook matches on this field."}
      >
        <Input
          id="stripeCustomerId"
          placeholder="cus_..."
          aria-invalid={!!errors.stripeCustomerId}
          {...register("stripeCustomerId")}
        />
      </FormField>
      <Button type="submit" size="sm" loading={pending}>
        {pending ? "Linking..." : "Link customer"}
      </Button>
    </form>
  );
}
