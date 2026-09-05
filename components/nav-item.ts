import { cn } from "@/lib/utils";

/** Sidebar/drawer nav item styling, shared by the dashboard and admin shells. */
export function navItemClassName(active: boolean) {
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-brand-primary-tint text-brand-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );
}
