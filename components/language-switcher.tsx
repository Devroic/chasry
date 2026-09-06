"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocale } from "@/lib/locale-actions";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/locale";
import { BlockingOverlay } from "@/components/blocking-overlay";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("header");
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <BlockingOverlay show={isPending} spinner={false} />
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("language")}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Languages className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => startTransition(() => setLocale(code))}
            className={code === locale ? "font-semibold text-brand-primary" : undefined}
          >
            {LOCALE_LABELS[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
