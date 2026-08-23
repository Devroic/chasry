import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-brand-secondary-tint/40">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[0_1px_2px_rgba(13,13,13,0.04),0_12px_32px_-16px_rgba(13,13,13,0.12)] sm:p-10">
            {children}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
