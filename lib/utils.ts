import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
  const formData = new FormData()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue
    formData.set(key, value === null ? "" : String(value))
  }
  return formData
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
  overrides: Record<string, string | undefined>
) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    if (value) params.set(key, value)
  }
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}
