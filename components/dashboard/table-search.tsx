import { Search } from "lucide-react";

/** Plain GET form — no client JS needed, works like the existing filter tabs. */
export function TableSearch({
  action,
  placeholder,
  defaultValue,
  hiddenParams,
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
  hiddenParams?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      {hiddenParams &&
        Object.entries(hiddenParams).map(([key, value]) =>
          value ? <input key={key} type="hidden" name={key} value={value} /> : null
        )}
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-input bg-transparent py-1 pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-64"
      />
    </form>
  );
}
