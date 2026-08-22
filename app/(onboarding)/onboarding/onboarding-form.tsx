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
import { completeOnboarding, type OnboardingState } from "./actions";
import { FREE_INVOICE_LIMIT } from "@/lib/plan";

const CURRENCIES = ["EUR", "USD", "GBP"];

function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function OnboardingForm({ defaultBusinessName }: { defaultBusinessName: string }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    null
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="business_name">Business name</Label>
        <Input
          id="business_name"
          name="business_name"
          defaultValue={defaultBusinessName}
          placeholder="Your business or freelance name"
          required
        />
        <p className="text-xs text-muted-foreground">
          This is how you&rsquo;ll appear to clients in reminder emails.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="currency">Currency</Label>
          <Select name="currency" defaultValue="EUR">
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
          <input type="hidden" name="timezone" value={detectTimezone()} />
          <Input id="timezone" value={detectTimezone()} disabled />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Go to dashboard"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Free for up to {FREE_INVOICE_LIMIT} active invoices. Upgrade to Pro anytime from Settings.
      </p>
    </form>
  );
}
