"use client";

import Form from "next/form";
import { useFormStatus } from "react-dom";
import { Search, Loader2 } from "lucide-react";

// next/form navigates client-side (a native <form> would full-reload), which is
// also what lets useFormStatus below report a pending state.
function SearchSubmitIcon() {
  const { pending } = useFormStatus();
  return pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" />;
}

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
    <Form action={action} className="relative">
      <button
        type="submit"
        aria-label={placeholder}
        className="absolute top-1/2 left-0 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <SearchSubmitIcon />
      </button>
      {hiddenParams &&
        Object.entries(hiddenParams).map(([key, value]) =>
          value ? <input key={key} type="hidden" name={key} value={value} /> : null
        )}
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        // The native search-input clear ("x") button fires this same event with an empty value.
        onChange={(e) => {
          if (e.target.value === "") e.target.form?.requestSubmit();
        }}
        className="h-9 w-full rounded-lg border border-input bg-transparent py-1 pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-64"
      />
    </Form>
  );
}
