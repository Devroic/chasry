import { CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

/** Centered single-card chrome for the public signed-link pages. */
export function PublicCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-brand-secondary-tint/40">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-card sm:p-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Terminal state of a signed-link page: a title, one line of copy, optionally a success check. */
export function PublicStatusCard({
  title,
  body,
  success,
}: {
  title: string;
  body: string;
  success?: boolean;
}) {
  return (
    <div className="text-center">
      {success && (
        <CheckCircle2 className="mx-auto mb-4 size-10 text-emerald-600 dark:text-emerald-400" />
      )}
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
