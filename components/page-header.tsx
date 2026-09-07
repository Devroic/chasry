import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  titleBadge,
  description,
  action,
  className,
}: {
  title: string;
  /** Rendered inline next to the title (e.g. a status Badge). */
  titleBadge?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /**
   * Overrides the default `mb-6`, e.g. `mb-0` inside a `flex flex-col gap-*` parent. Not with
   * `space-y-*`: Tailwind 4 implements that as a child bottom margin, which `mb-0` cancels.
   */
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-4", className)}>
      <div>
        <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold text-foreground">
          {title}
          {titleBadge}
        </h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
