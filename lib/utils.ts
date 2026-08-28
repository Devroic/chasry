import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Converts a validated object into FormData for a Server Action. `null` becomes an
// empty string ("clear this field"); `undefined` is omitted entirely (not applicable).
export function toFormData(values: Record<string, unknown>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    formData.set(key, value === null ? "" : String(value));
  }
  return formData;
}

/** Rows per page on every paginated list page (clients, invoices, admin users). */
export const LIST_PAGE_SIZE = 20;

// Slices a pre-filtered/sorted list-page array into one page, clamping an
// out-of-range `?page=` into `[1, totalPages]` instead of returning an empty page.
export function paginate<T>(
  items: T[],
  pageParam: string | undefined,
  pageSize = LIST_PAGE_SIZE,
) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    totalPages,
  };
}

// Builds a `pathname?query` string for a list page's links, merging `overrides`
// onto the current params and dropping empty values.
export function buildListHref(
  pathname: string,
  current: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
