/**
 * Lightweight "no results in this view" message. `EmptyState` stays reserved for true first-run
 * emptiness with a call to action.
 */
export function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
