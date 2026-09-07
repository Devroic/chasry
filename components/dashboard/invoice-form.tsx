"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Link2, Languages } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { InvoiceAttachmentField } from "@/components/dashboard/invoice-attachment-field";
import type { InvoiceFormState } from "@/app/(dashboard)/invoices/actions";
import { invoiceSchema, type InvoiceInput } from "@/lib/validations/invoice";
import { cn, toFormData } from "@/lib/utils";
import { encodeReminderOverride } from "@/lib/reminder-override";
import { withReturnTo } from "@/lib/return-to";
import { overrideBadgeClass } from "@/lib/override-badge";
import type { z } from "zod";

type InvoiceFormValues = z.input<ReturnType<typeof invoiceSchema>>;

type CustomerOption = {
  id: string;
  name: string;
  payment_link: string | null;
  reminder_offsets: number[] | null;
  reminder_enabled: boolean | null;
  reminder_locale: string | null;
};

function todayIso() {
  // Local calendar date, not UTC: toISOString() shows yesterday east of UTC before the rollover.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function InvoiceForm({
  action,
  customers,
  currency,
  defaultValues,
  defaultCustomerId,
  suggestedInvoiceNumber,
  defaultPaymentLink,
  accountDefaults,
  lockCustomer = false,
  lockReason = "editing",
  cancelHref,
  submitLabel,
  isPro,
  invoiceId,
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
    recurring?: "none" | "monthly";
    reminder_offsets: number[] | null;
    reminder_enabled: boolean | null;
    attachment_filename?: string | null;
  };
  defaultCustomerId?: string;
  /** Prefilled invoice number for a *new* invoice, e.g. "INV-1043" following the last one used. */
  suggestedInvoiceNumber?: string;
  /** The business's default payment link — the last fallback once the client's own is checked. */
  defaultPaymentLink?: string;
  /** The account's reminder defaults — used to describe/seed the override section and the info note. */
  accountDefaults: { offsets: number[]; enabled: boolean; locale: string };
  /** Shows the client read-only instead of a Select (editing, or preselected from a client's page). */
  lockCustomer?: boolean;
  /** Which lockCustomer caller this is — picks the read-only hint's wording. */
  lockReason?: "editing" | "preselected";
  /** When set, a Cancel button appears next to Save and returns here. */
  cancelHref?: string;
  submitLabel?: string;
  /** Attaching a file is a Pro feature — gates the field itself. */
  isPro: boolean;
  /** Enables removing an already-saved attachment. Undefined on the create form. */
  invoiceId?: string;
}) {
  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(action, null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations("invoices.form");
  const tCommon = useTranslations("common");
  const tReminderOverride = useTranslations("reminderOverride");
  const tValidation = useTranslations("validation");

  const initialCustomerId =
    searchParams.get("new_customer_id") ?? defaultValues?.customer_id ?? defaultCustomerId ?? "";

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<InvoiceFormValues, unknown, InvoiceInput>({
    resolver: zodResolver(invoiceSchema(tValidation)),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      // Auto-selects a client just created inline via /clients/new.
      customer_id: initialCustomerId,
      invoice_number: defaultValues?.invoice_number ?? "",
      amount: defaultValues?.amount,
      currency,
      // `||` not `??`: a duplicate passes "" so the date defaults to today.
      due_date: defaultValues?.due_date || todayIso(),
      notes: defaultValues?.notes ?? "",
      recurring: defaultValues?.recurring ?? "none",
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

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Action redirects keep scroll: scroll on unmount after success or when an error appears on top.
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

  const onValid = (data: InvoiceInput) => {
    redirectingRef.current = true;
    const formData = toFormData({
      customer_id: data.customer_id,
      invoice_number: data.invoice_number,
      amount: data.amount,
      currency: data.currency,
      due_date: data.due_date,
      notes: data.notes,
      recurring: data.recurring,
    });
    encodeReminderOverride(formData, reminderActive, reminderEnabled, reminderOffsets);
    if (attachmentFile) formData.set("attachment", attachmentFile);
    startTransition(() => formAction(formData));
  };

  // 2-level cascade, no invoice-level override — shown as an info note below, not an editable field.
  const effectivePaymentLink = selectedCustomer?.payment_link || defaultPaymentLink;
  const effectiveOffsets = selectedCustomer?.reminder_offsets ?? accountDefaults.offsets;
  const effectiveEnabled = selectedCustomer?.reminder_enabled ?? accountDefaults.enabled;
  const effectiveLocale = selectedCustomer?.reminder_locale ?? accountDefaults.locale;

  // One row of the "Reminder emails" summary: value, where it comes from, and the two ways to change it.
  // Mirrors the invoice detail card so the same facts look the same on both pages.
  // A client picked from the dropdown isn't in the URL, so carry it as new_customer_id (which the
  // form already reads on load) or it's gone when the user comes back from settings or the client.
  const returnParams = new URLSearchParams(searchParams);
  if (selectedCustomerId && !defaultValues) returnParams.set("new_customer_id", selectedCustomerId);
  const qs = returnParams.toString();
  const returnHere = qs ? `${pathname}?${qs}` : pathname;
  const summaryRow = ({
    icon,
    label,
    value,
    clientHasOwn,
    defaultLabel,
  }: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    clientHasOwn: boolean;
    defaultLabel: string;
  }) => (
    <div className="grid gap-1 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon} {label}
      </dt>
      <dd className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {value}
          {selectedCustomer && (
            <Badge
              variant="outline"
              className={cn("whitespace-nowrap", overrideBadgeClass(clientHasOwn))}
            >
              {clientHasOwn ? t("sourceClient") : t("sourceAccount")}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          <Link href={withReturnTo("/settings/reminders", returnHere)} className="text-brand-primary hover:underline">
            {defaultLabel}
          </Link>
          {selectedCustomer && (
            <>
              <span aria-hidden="true"> · </span>
              <Link
                href={withReturnTo(`/clients/${selectedCustomer.id}/edit`, returnHere)}
                className="text-brand-primary hover:underline"
              >
                {clientHasOwn ? t("changeForClient") : t("setForClient")}
              </Link>
            </>
          )}
        </p>
      </dd>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
      {/* Page locks while saving; the submit button's spinner is the indicator. */}
      <BlockingOverlay show={pending} spinner={false} />
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {lockCustomer ? (
        <FormField label={t("clientLabel")} htmlFor="customer_id_display">
          <div
            id="customer_id_display"
            className="flex h-8 w-full items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm text-foreground"
          >
            {selectedCustomer?.name ?? ""}
          </div>
          <p className="text-xs text-muted-foreground">
            {t(lockReason === "preselected" ? "clientLockedHintPreselected" : "clientLockedHint")}
          </p>
        </FormField>
      ) : (
        <FormField
          label={t("clientLabel")}
          htmlFor="customer_id"
          error={errors.customer_id?.message}
          labelAction={
            <Link
              href={`/clients/new?return_to=${pathname}`}
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
                <SelectTrigger
                  id="customer_id"
                  className="w-full"
                  aria-invalid={!!errors.customer_id}
                >
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
              <Link href="/clients/new" className="text-brand-primary hover:underline">
                {t("addOne")}
              </Link>
              .
            </p>
          )}
        </FormField>
      )}

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
            placeholder={suggestedInvoiceNumber || t("invoiceNumberPlaceholder")}
            aria-invalid={!!errors.invoice_number}
            {...register("invoice_number")}
          />
        </FormField>
      </div>

      <input type="hidden" {...register("currency")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("dueDateLabel")} htmlFor="due_date" error={errors.due_date?.message}>
          <Input
            id="due_date"
            type="date"
            className="sm:w-56"
            aria-invalid={!!errors.due_date}
            {...register("due_date")}
          />
        </FormField>
        <FormField
          label={t("recurringLabel")}
          htmlFor="recurring"
          hint={isPro ? t("recurringHint") : undefined}
        >
          <Controller
            name="recurring"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={!isPro}>
                <SelectTrigger id="recurring" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("recurringNone")}</SelectItem>
                  <SelectItem value="monthly">{t("recurringMonthly")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {/* Same Pro-upsell treatment as the attachment field below. */}
          {!isPro && (
            <p className="rounded-lg border border-border bg-brand-primary-tint p-3 text-xs text-muted-foreground">
              {t("recurringProOnly")}{" "}
              <Link href={withReturnTo("/settings/billing", returnHere)} className="text-brand-primary hover:underline">
                {t("attachmentUpgrade")}
              </Link>
            </p>
          )}
        </FormField>
      </div>

      <FormField
        label={t("notesLabel")}
        htmlFor="notes"
        error={errors.notes?.message}
        hint={errors.notes ? undefined : t("notesHint")}
      >
        <Textarea id="notes" rows={3} aria-invalid={!!errors.notes} {...register("notes")} />
      </FormField>

      <FormField label={t("attachmentLabel")} htmlFor="attachment">
        <InvoiceAttachmentField
          isPro={isPro}
          invoiceId={invoiceId}
          currentFilename={defaultValues?.attachment_filename ?? null}
          selectedFile={attachmentFile}
          onFileChange={setAttachmentFile}
          upgradeHref={withReturnTo("/settings/billing", returnHere)}
        />
      </FormField>

      <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-foreground">{t("summaryTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("summaryHint")}</p>
        <dl className="mt-3 space-y-3">
          {summaryRow({
            icon: <Link2 className="size-3.5" />,
            label: t("summaryPaymentLink"),
            value: effectivePaymentLink ? (
              <span className="min-w-0 break-all text-sm text-foreground">{effectivePaymentLink}</span>
            ) : (
              <span className="text-sm text-muted-foreground">{t("summaryNone")}</span>
            ),
            clientHasOwn: !!selectedCustomer?.payment_link,
            defaultLabel: effectivePaymentLink ? t("changeDefault") : t("addDefault"),
          })}
          {summaryRow({
            icon: <Languages className="size-3.5" />,
            label: t("summaryLanguage"),
            value: <span className="text-sm text-foreground">{tCommon(`localeNames.${effectiveLocale}`)}</span>,
            clientHasOwn: !!selectedCustomer?.reminder_locale,
            defaultLabel: t("changeDefault"),
          })}
        </dl>
      </div>

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

      <div className="flex items-center gap-2">
        <Button type="submit" loading={pending} disabled={customers.length === 0}>
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
