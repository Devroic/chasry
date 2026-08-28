import { Check } from "lucide-react";

export function FormTips({ title, tips }: { title: string; tips: string[] }) {
  return (
    // self-start: every caller places this next to a form card inside a
    // `grid`, whose default align-items: stretch would otherwise force
    // this box to match the (usually much taller) form's height, leaving
    // a large block of empty background below the last tip.
    <div className="self-start rounded-2xl border border-border bg-brand-primary-tint p-6">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="mt-3 space-y-3">
        {tips.map((tip) => (
          <li key={tip} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-primary" />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
