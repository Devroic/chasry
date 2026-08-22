"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvoiceFormState } from "@/app/(dashboard)/invoices/actions";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function InvoiceForm({
  action,
  customers,
  currency,
  defaultValues,
  defaultCustomerId,
  submitLabel = "Save invoice",
}: {
  action: (prev: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
  customers: { id: string; name: string }[];
  currency: string;
  defaultValues?: {
    customer_id: string;
    invoice_number: string | null;
    amount: number;
    issued_date: string;
    due_date: string;
    notes: string | null;
  };
  defaultCustomerId?: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(action, null);
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [dueDate, setDueDate] = useState(defaultValues?.due_date ?? addDaysIso(14));
  // If we just created a client inline (redirected back from /customers/new),
  // select it automatically instead of leaving the form blank. This only
  // needs to run once per mount, since returning from /customers/new is a
  // fresh page navigation, not a re-render of this same instance.
  const [customerId, setCustomerId] = useState(
    () => searchParams.get("new_customer_id") ?? defaultValues?.customer_id ?? defaultCustomerId ?? ""
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="customer_id">Client</Label>
          <Link
            href={`/customers/new?return_to=${pathname}`}
            className="text-xs font-medium text-brand-primary hover:underline"
          >
            + Add new client
          </Link>
        </div>
        <Select name="customer_id" value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger id="customer_id" className="w-full">
            <SelectValue placeholder="Choose a client" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {customers.length === 0 && (
          <p className="text-xs text-muted-foreground">
            You need a client first —{" "}
            <Link href="/customers/new" className="text-brand-primary hover:underline">
              add one
            </Link>
            .
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={defaultValues?.amount}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invoice_number">Invoice number (optional)</Label>
          <Input
            id="invoice_number"
            name="invoice_number"
            defaultValue={defaultValues?.invoice_number ?? ""}
            placeholder="INV-1001"
          />
        </div>
      </div>

      <input type="hidden" name="currency" value={currency} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="issued_date">Issued</Label>
          <Input
            id="issued_date"
            name="issued_date"
            type="date"
            defaultValue={defaultValues?.issued_date ?? todayIso()}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="due_date">Due date</Label>
          <Input
            id="due_date"
            name="due_date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex gap-2">
        {[7, 14, 30].map((days) => (
          <Button
            key={days}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDueDate(addDaysIso(days))}
          >
            Net {days}
          </Button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <Button type="submit" disabled={pending || customers.length === 0}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
