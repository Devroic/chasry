"use client";

import { useActionState, startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BlockingOverlay } from "@/components/blocking-overlay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReminderOverrideSection } from "@/components/dashboard/reminder-override-section";
import type { CustomerFormState } from "@/app/(dashboard)/clients/actions";
import { customerSchema, type CustomerInput } from "@/lib/validations/customer";
import { toFormData } from "@/lib/utils";
import { encodeReminderOverride } from "@/lib/reminder-override";
import { LOCALES, type Locale } from "@/lib/locale";
import type { z } from "zod";

/** Radix Select rejects empty-string item values, so this stands in for "no override". */
const ACCOUNT_DEFAULT_SENTINEL = "account_default";

type CustomerFormValues = z.input<ReturnType<typeof customerSchema>>;

export function CustomerForm({
  action,
  defaultValues,
  accountDefaults,
  submitLabel,
  cancelHref,
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
    reminder_locale: "en" | "el" | null;
  };
  /** The account's own reminder default — used to describe and seed the override section. */
  accountDefaults: { offsets: number[]; enabled: boolean; locale: "en" | "el" };
  submitLabel?: string;
  /** When set, a Cancel button appears next to Save and returns here. */
  cancelHref?: string;
  returnTo?: string;
}) {
  const [state, formAction, pending] = useActionState<CustomerFormState, FormData>(action, null);
  const t = useTranslations("customers.form");
  const tCommon = useTranslations("common");
  const tReminderOverride = useTranslations("reminderOverride");
  const tValidation = useTranslations("validation");
  const localeLabels: Record<Locale, string> = {
    en: tCommon("localeNames.en"),
    el: tCommon("localeNames.el"),
  };
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues, unknown, CustomerInput>({
    resolver: zodResolver(customerSchema(tValidation)),
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
      reminder_locale: defaultValues?.reminder_locale ?? "",
    },
  });

  // Not register()-able, so held in state and stitched into FormData by encodeReminderOverride.
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

  // Scroll on real page change (unmount after a successful submit) or when an error appears at
  // the top, never on the click itself.
  const redirectingRef = useRef(false);
  useEffect(() => {
    if (state?.error) {
      redirectingRef.current = false;
      window.scrollTo({ top: 0 });
    }
  }, [state]);
  useEffect(
    () => () => {
      if (redirectingRef.current) window.scrollTo(0, 0);
    },
    []
  );

  const onValid = (data: CustomerInput) => {
    redirectingRef.current = true;
    const formData = toFormData({
      name: data.name,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
      payment_link: data.payment_link,
      reminder_locale: data.reminder_locale,
      return_to: returnTo,
    });
    encodeReminderOverride(formData, reminderActive, reminderEnabled, reminderOffsets);
    startTransition(() => formAction(formData));
  };

  return (
    // handleSubmit runs inside the event, so the React Compiler allows onValid's ref write.
    <form onSubmit={(e) => handleSubmit(onValid)(e)} noValidate className="space-y-4">
      {/* Page locks while saving; the submit button's spinner is the indicator. */}
      <BlockingOverlay show={pending} spinner={false} />
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
        <Input
          id="phone"
          type="tel"
          aria-invalid={!!errors.phone}
          {...register("phone", {
            // Strips as-typed, matching the allowed set validated server-side.
            onChange: (e) => {
              e.target.value = e.target.value.replace(/[^0-9+()\s-]/g, "");
            },
          })}
        />
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
          placeholder={tCommon("paymentLinkPlaceholder")}
          aria-invalid={!!errors.payment_link}
          {...register("payment_link")}
        />
      </FormField>

      <FormField label={t("reminderLocaleLabel")} htmlFor="reminder_locale">
        <Controller
          name="reminder_locale"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value || ACCOUNT_DEFAULT_SENTINEL}
              onValueChange={(v) => field.onChange(v === ACCOUNT_DEFAULT_SENTINEL ? "" : v)}
            >
              <SelectTrigger id="reminder_locale" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ACCOUNT_DEFAULT_SENTINEL}>
                  {t("reminderLocaleAccountDefault")} ({localeLabels[accountDefaults.locale]})
                </SelectItem>
                {LOCALES.map((locale) => (
                  <SelectItem key={locale} value={locale}>
                    {localeLabels[locale]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField
        label={t("notesLabel")}
        htmlFor="notes"
        error={errors.notes?.message}
        hint={errors.notes ? undefined : t("notesHint")}
      >
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

      <div className="flex items-center gap-2">
        <Button type="submit" loading={pending}>
          {pending ? tCommon("saving") : (submitLabel ?? t("submitCreate"))}
        </Button>
        {cancelHref && (
          <Button type="button" variant="ghost" asChild>
            <Link href={cancelHref}>{tCommon("cancel")}</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
