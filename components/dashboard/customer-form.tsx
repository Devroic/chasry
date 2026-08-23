"use client";

import { useActionState, startTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReminderOverrideSection } from "@/components/dashboard/reminder-override-section";
import type { CustomerFormState } from "@/app/(dashboard)/customers/actions";
import { customerSchema, type CustomerInput } from "@/lib/validations/customer";
import { toFormData } from "@/lib/utils";
import { encodeReminderOverride } from "@/lib/reminder-override";
import type { z } from "zod";

type CustomerFormValues = z.input<typeof customerSchema>;

export function CustomerForm({
  action,
  defaultValues,
  accountDefaults,
  submitLabel,
  returnTo,
}: {
  action: (prev: CustomerFormState, formData: FormData) => Promise<CustomerFormState>;
  defaultValues?: {
    name: string;
    email: string;
    phone: string | null;
    notes: string | null;
    payment_link: string | null;
    reminder_offsets: number[] | null;
    reminder_enabled: boolean | null;
  };
  /** The account's own reminder default — used to describe and seed the override section. */
  accountDefaults: { offsets: number[]; enabled: boolean };
  submitLabel?: string;
  returnTo?: string;
}) {
  const [state, formAction, pending] = useActionState<CustomerFormState, FormData>(action, null);
  const t = useTranslations("customers.form");
  const tCommon = useTranslations("common");
  const tReminderOverride = useTranslations("reminderOverride");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues, unknown, CustomerInput>({
    resolver: zodResolver(customerSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      notes: defaultValues?.notes ?? "",
      payment_link: defaultValues?.payment_link ?? "",
      reminder_offsets: null,
      reminder_enabled: null,
    },
  });

  // The reminder override isn't a plain text field react-hook-form can
  // `register()` — it's managed here and stitched into the submitted
  // FormData in `onValid` via `encodeReminderOverride`, same approach as
  // the global reminder-settings form.
  const [reminderActive, setReminderActive] = useState(defaultValues?.reminder_offsets != null);
  const [reminderEnabled, setReminderEnabled] = useState(
    defaultValues?.reminder_enabled ?? accountDefaults.enabled
  );
  const [reminderOffsets, setReminderOffsets] = useState<number[]>(
    defaultValues?.reminder_offsets ?? accountDefaults.offsets
  );

  function toggleOffset(value: number, checked: boolean) {
    setReminderOffsets((prev) => (checked ? [...prev, value] : prev.filter((v) => v !== value)));
  }

  const onValid = (data: CustomerInput) => {
    const formData = toFormData({
      name: data.name,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
      payment_link: data.payment_link,
      return_to: returnTo,
    });
    encodeReminderOverride(formData, reminderActive, reminderEnabled, reminderOffsets);
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <FormField label={t("nameLabel")} htmlFor="name" error={errors.name?.message}>
        <Input id="name" autoFocus aria-invalid={!!errors.name} {...register("name")} />
      </FormField>

      <FormField
        label={t("emailLabel")}
        htmlFor="email"
        error={errors.email?.message}
        hint={errors.email ? undefined : t("emailHint")}
      >
        <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
      </FormField>

      <FormField label={t("phoneLabel")} htmlFor="phone" error={errors.phone?.message}>
        <Input id="phone" type="tel" aria-invalid={!!errors.phone} {...register("phone")} />
      </FormField>

      <FormField
        label={t("paymentLinkLabel")}
        htmlFor="payment_link"
        error={errors.payment_link?.message}
        hint={errors.payment_link ? undefined : t("paymentLinkHint")}
      >
        <Input
          id="payment_link"
          type="url"
          placeholder="https://buy.stripe.com/... or https://paypal.me/you"
          aria-invalid={!!errors.payment_link}
          {...register("payment_link")}
        />
      </FormField>

      <FormField label={t("notesLabel")} htmlFor="notes" error={errors.notes?.message}>
        <Textarea id="notes" rows={3} aria-invalid={!!errors.notes} {...register("notes")} />
      </FormField>

      <ReminderOverrideSection
        idPrefix="customer_reminder"
        scopeLabel={tReminderOverride("scopeClient")}
        fallbackOffsets={accountDefaults.offsets}
        fallbackEnabled={accountDefaults.enabled}
        active={reminderActive}
        onActiveChange={setReminderActive}
        enabled={reminderEnabled}
        onEnabledChange={setReminderEnabled}
        offsets={reminderOffsets}
        onToggleOffset={toggleOffset}
      />

      <Button type="submit" loading={pending}>
        {pending ? tCommon("saving") : (submitLabel ?? t("submitCreate"))}
      </Button>
    </form>
  );
}
