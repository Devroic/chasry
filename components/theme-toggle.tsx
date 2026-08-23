"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Sun/moon theme toggle.
 *
 * **Which icon/label shows is decided by CSS (`dark:` variants), never by
 * branching on `resolvedTheme` during render** — the same trick the dual
 * logos in `SiteHeader`/`DashboardShell` use. This is load-bearing, not a
 * style preference: `next-themes` injects a *blocking* inline script that
 * reads `localStorage` and sets the `dark` class before React hydrates, so
 * on a visitor who has toggled to dark, `resolvedTheme` is already `"dark"`
 * on the client's very first render while the server rendered `undefined`.
 * A render-time `resolvedTheme === "dark" ? <Sun/> : <Moon/>` therefore
 * produced a real hydration mismatch (React re-rendered the whole subtree
 * and logged an error on every page load in dark mode). An earlier version
 * of this file did exactly that, with a comment asserting both sides saw
 * `undefined` — that was wrong; don't reintroduce it. The alternative fix,
 * a `mounted` state guard, would flash the wrong icon for a frame and trips
 * eslint's `react-hooks/set-state-in-effect`.
 *
 * Reading `resolvedTheme` inside `onClick` is fine — that only runs after
 * hydration, so there's no mismatch to cause.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("header");

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
      {/* Accessible name, swapped by CSS for the same reason as the icon. */}
      <span className="sr-only dark:hidden">{t("darkMode")}</span>
      <span className="sr-only hidden dark:inline">{t("lightMode")}</span>
    </Button>
  );
}
