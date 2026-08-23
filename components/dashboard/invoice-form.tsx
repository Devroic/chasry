"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReminderOverrideSection } from "@/components/dashboard/reminder-override-section";
import type { InvoiceFormState } from "@/app/(dashboard)/invoices/actions";
import { invoiceSchema, type InvoiceInput } from "@/lib/validations/invoice";
import { toFormData } from "@/lib/utils";
import { encodeReminderOverride } from "@/lib/reminder-override";
import type { z } from "zod";

type InvoiceFormValues = z.input<typeof invoiceSchema>;

type CustomerOption = {
  id: string;
  name: string;
  payment_link: string | null;
  reminder_offsets: number[] | null;
  reminder_enabled: boolean | null;
};

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const DUE_DATE_PRESET_DAYS = [7, 14, 30] as const;

export function InvoiceForm({
  action,
  customers,
  currency,
  defaultValues,
  defaultCustomerId,
  suggestedInvoiceNumber,
  defaultPaymentLink,
  accountDefaults,
  submitLabel,
}: {
  action: (prev: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
  customers: CustomerOption[];
  currency: string;
  defaultValues?: {
    customer_id: string;
    invoice_number: string | null;
    amount: number;
    due_date: string;
    notes: string | null;
    reminder_offsets: number[] | null;
    reminder_enabled: boolean | null;
  };
  defaultCustomerId?: string;
  /** Prefilled invoice number for a *new* invoice, e.g. "INV-1043" following the last one used. */
  suggestedInvoiceNumber?: string;
  /** The business's default payment link — the last fallback once the client's own is checked. */
  defaultPaymentLink?: string;
  /** The account's reminder default — used to describe/seed the override section. */
  accountDefaults: { offsets: number[]; enabled: boolean };
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(action, null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations("invoices.form");
  const tCommon = useTranslations("common");
  const tReminderOverride = useTranslations("reminderOverride");
  const presetLabels: Record<(typeof DUE_DATE_PRESET_DAYS)[number], string> = {
    7: t("preset1Week"),
    14: t("preset2Weeks"),
    30: t("preset1Month"),
  };

  const initialCustomerId =
    searchParams.get("new_customer_id") ?? defaultValues?.customer_id ?? defaultCustomerId ?? "";

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<InvoiceFormValues, unknown, InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      // If we just created a client inline (redirected back from /customers/new),
      // select it automatically instead of leaving the form blank.
      customer_id: initialCustomerId,
      invoice_number: defaultValues?.invoice_number ?? suggestedInvoiceNumber ?? "",
      amount: defaultValues?.amount,
      currency,
      due_date: defaultValues?.due_date ?? addDaysIso(14),
      notes: defaultValues?.notes ?? "",
      reminder_offsets: null,
      reminder_enabled: null,
    },
  });

  const selectedCustomerId = watch("customer_id");
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const [reminderActive, setReminderActive] = useState(defaultValues?.reminder_offsets != null);
  const [reminderEnabled, setReminderEnabled] = useState(
    defaultValues?.reminder_enabled ?? selectedCustomer?.reminder_enabled ?? accountDefaults.enabled
  );
  const [reminderOffsets, setReminderOffsets] = useState<number[]>(
    defaultValues?.reminder_offsets ?? selectedCustomer?.reminder_offsets ?? accountDefaults.offsets
  );

  function toggleOffset(value: number, checked: boolean) {
    setReminderOffsets((prev) => (checked ? [...prev, value] : prev.filter((v) => v !== value)));
  }

  const onValid = (data: InvoiceInput) => {
    const formData = toFormData({
      customer_id: data.customer_id,
      invoice_number: data.invoice_number,
      amount: data.amount,
      currency: data.currency,
      due_date: data.due_date,
      notes: data.notes,
    });
    encodeReminderOverride(formData, reminderActive, reminderEnabled, reminderOffsets);
    startTransition(() => formAction(formData));
  };

  // Payment link is a 2-level cascade (client → account default) with no
  // invoice-level override — shown as a plain info note below, not an
  // editable field. Change it from the client page or account settings.
  const effectivePaymentLink = selectedCustomer?.payment_link || defaultPaymentLink;
  const effectiveOffsets = selectedCustomer?.reminder_offsets ?? accountDefaults.offsets;
  const effectiveEnabled = selectedCustomer?.reminder_enabled ?? accountDefaults.enabled;

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <FormField
        label={t("clientLabel")}
        htmlFor="customer_id"
        error={errors.customer_id?.message}
        labelAction={
          <Link
            href={`/customers/new?return_to=${pathname}`}
            className="text-xs font-medium text-brand-primary hover:underline"
          >
            {t("addNewClient")}
          </Link>
        }
      >
        <Controller
          name="customer_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="customer_id" className="w-full" aria-invalid={!!errors.customer_id}>
                <SelectValue placeholder={t("clientPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {customers.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t("needClientFirst")}{" "}
            <Link href="/customers/new" className="text-brand-primary hover:underline">
              {t("addOne")}
            </Link>
            .
          </p>
        )}
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("amountLabel")} htmlFor="amount" error={errors.amount?.message}>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            aria-invalid={!!errors.amount}
            {...register("amount")}
          />
        </FormField>
        <FormField
          label={t("invoiceNumberLabel")}
          htmlFor="invoice_number"
          error={errors.invoice_number?.message}
        >
          <Input
            id="invoice_number"
            placeholder={t("invoiceNumberPlaceholder")}
            aria-invalid={!!errors.invoice_number}
            {...register("invoice_number")}
          />
        </FormField>
      </div>

      <input type="hidden" {...register("currency")} />

      <FormField label={t("dueDateLabel")} htmlFor="due_date" error={errors.due_date?.message}>
        <Input
          id="due_date"
          type="date"
          className="sm:w-56"
          aria-invalid={!!errors.due_date}
          {...register("due_date")}
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("presetsLabel")}</span>
        {DUE_DATE_PRESET_DAYS.map((days) => (
          <Button
            key={days}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setValue("due_date", addDaysIso(days), { shouldValidate: true })}
          >
            {presetLabels[days]}
          </Button>
        ))}
      </div>

      <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        {effectivePaymentLink
          ? t("paymentLinkNote", {
              source: selectedCustomer?.payment_link
                ? t("paymentLinkSourceClient")
                : t("paymentLinkSourceAccount"),
              link: effectivePaymentLink,
            })
          : t("paymentLinkNoteNone")}
      </p>

      <FormField label={t("notesLabel")} htmlFor="notes" error={errors.notes?.message}>
        <Textarea id="notes" rows={3} aria-invalid={!!errors.notes} {...register("notes")} />
      </FormField>

      <ReminderOverrideSection
        idPrefix="invoice_reminder"
        scopeLabel={tReminderOverride("scopeInvoice")}
        fallbackOffsets={effectiveOffsets}
        fallbackEnabled={effectiveEnabled}
        active={reminderActive}
        onActiveChange={setReminderActive}
        enabled={reminderEnabled}
        onEnabledChange={setReminderEnabled}
        offsets={reminderOffsets}
        onToggleOffset={toggleOffset}
      />

      <Button type="submit" disabled={pending || customers.length === 0}>
        {pending ? tCommon("saving") : (submitLabel ?? t("submitCreate"))}
      </Button>
    </form>
  );
}
