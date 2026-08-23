"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function SignupConfirmedPage() {
  const [status, setStatus] = useState<"checking" | "confirmed" | "invalid">("checking");
  const t = useTranslations("auth.signupConfirmed");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "confirmed" : "invalid");
    });
  }, []);

  if (status === "checking") {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Loader2 className="size-6 animate-spin text-brand-primary" aria-label={t("confirming")} />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <XCircle className="size-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">
          {t("expiredTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("expiredSubtitle")}</p>
        <Button asChild className="mt-8 h-11 w-full text-base font-semibold">
          <Link href="/signup">{t("backToSignup")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-4 text-center">
      <CheckCircle2 className="size-10 text-emerald-600" />
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">
        {t("confirmedTitle")}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("confirmedSubtitle")}</p>
      <Button asChild className="mt-8 h-11 w-full text-base font-semibold">
        <Link href="/onboarding">{t("continue")}</Link>
      </Button>
    </div>
  );
}
