"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signup, type AuthFormState } from "@/app/(auth)/actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signup, null);

  if (state?.success) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Check your inbox</h1>
        <p className="mt-3 text-sm text-muted-foreground">{state.success}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Free to start, no card required. Upgrade to Pro whenever you outgrow it.
      </p>

      <form action={formAction} className="mt-8 space-y-4">
        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="business_name">Business name</Label>
          <Input id="business_name" name="business_name" autoComplete="organization" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
