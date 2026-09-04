/**
 * One titled section of a legal document. Not run through next-intl: legal text is too risky to
 * mistranslate, so body copy stays English-only in the page files.
 */
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
