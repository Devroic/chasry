import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a plain object (e.g. react-hook-form's validated output) into
 * FormData, so it can be handed to a Server Action's useActionState
 * dispatcher after client-side validation has already run.
 *
 * `null` becomes an empty string (an explicit "clear this field" — matches
 * what an empty native `<input>` would submit) while `undefined` is omitted
 * entirely (field genuinely not applicable, e.g. an optional `next` param).
 * Getting this backwards silently breaks clearing an optional field: it'd
 * never reach the server at all, so `.update()` would just leave the old
 * value in place instead of blanking it out.
 */
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

/**
 * Slices a pre-filtered/sorted list-page array into one page, clamping an
 * out-of-range `?page=` into `[1, totalPages]` instead of returning an empty
 * page. `from`/`to` are 1-indexed positions for a "Showing X-Y of Z" label;
 * `from === to` (a page holding exactly one row, e.g. the last page when
 * `totalCount % pageSize === 1`) is the caller's cue to use a "Showing X of
 * Z" label instead of a redundant "X-X of Z" one.
 */
export function paginate<T>(
  items: T[],
  pageParam: string | undefined,
  pageSize = LIST_PAGE_SIZE,
) {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    totalPages,
    totalCount,
    from,
    to,
  };
}

/**
 * Builds a `pathname?query` string for a list page's filter/search/sort
 * links, merging `overrides` on top of the page's current params and
 * dropping any key whose final value is empty/undefined — keeps URLs like
 * `/invoices?filter=overdue&sort=amount&dir=desc` clean instead of
 * accumulating empty params.
 */
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
