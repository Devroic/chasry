import Image from "next/image";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-primary-tint/40 px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <Image
          src="/brand/logo-light-bg.png"
          alt="Chasry"
          width={132}
          height={36}
          className="mb-8 h-8 w-auto"
          priority
        />
        {children}
      </div>
    </div>
  );
}
