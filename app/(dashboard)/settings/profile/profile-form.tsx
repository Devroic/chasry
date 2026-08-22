"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfile, type ProfileFormState } from "./actions";

const CURRENCIES = ["EUR", "USD", "GBP"];

export function ProfileForm({
  defaultValues,
  email,
}: {
  defaultValues: {
    business_name: string;
    timezone: string;
    currency: string;
    payment_link: string;
  };
  email: string;
}) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state?.success && (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input value={email} disabled />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="business_name">Business name</Label>
        <Input
          id="business_name"
          name="business_name"
          defaultValue={defaultValues.business_name}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="currency">Currency</Label>
          <Select name="currency" defaultValue={defaultValues.currency}>
            <SelectTrigger id="currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" name="timezone" defaultValue={defaultValues.timezone} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="payment_link">Payment link (optional)</Label>
        <Input
          id="payment_link"
          name="payment_link"
          type="url"
          placeholder="https://buy.stripe.com/... or https://paypal.me/you"
          defaultValue={defaultValues.payment_link}
        />
        <p className="text-xs text-muted-foreground">
          Add a Stripe Payment Link, PayPal.me, or any page clients can pay you from. When set,
          reminder emails include a &ldquo;Pay now&rdquo; button linking here — you can also set a
          different one per invoice.
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
