import Image from "next/image";

/** The light/dark logo pair, swapped by CSS rather than by reading the theme (hydration safety). */
export function BrandLogo() {
  return (
    <>
      <Image
        src="/brand/logo-light-bg.png"
        alt="Chasry"
        width={220}
        height={60}
        className="h-10 w-auto sm:h-14 dark:hidden"
        priority
      />
      <Image
        src="/brand/logo-dark-bg.png"
        alt="Chasry"
        width={220}
        height={60}
        className="hidden h-10 w-auto sm:h-14 dark:block"
        priority
      />
    </>
  );
}
