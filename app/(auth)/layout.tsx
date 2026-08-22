import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 flex items-center gap-2">
            <Image
              src="/brand/logo-light-bg.png"
              alt="Chasry"
              width={132}
              height={36}
              className="h-8 w-auto"
              priority
            />
          </Link>
          {children}
        </div>
      </div>

      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-brand-primary p-12 lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--brand-secondary)_0%,_transparent_45%)] opacity-30"
        />
        <div className="relative z-10 max-w-sm text-center">
          <Image
            src="/brand/mascot.png"
            alt=""
            width={320}
            height={320}
            className="mx-auto mb-8 w-56"
            priority
          />
          <h2 className="text-2xl font-semibold text-white">Remember to get paid.</h2>
          <p className="mt-3 text-brand-primary-tint/90">
            Log the invoice once. Chasry sends polite, automatic reminders until it&rsquo;s paid.
          </p>
        </div>
      </div>
    </div>
  );
}
