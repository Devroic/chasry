# List pages (invoices, customers)

Read this before touching the invoices or customers list page, or building a new list page.

Both list pages follow the same URL-driven pattern, no client-side data-table library:
filter/search/sort state lives in `searchParams` (`filter`, `q`, `sort`, `dir`), read
server-side, applied in JS after a single unfiltered Supabase fetch. Shared pieces:

- `lib/utils.ts`'s `buildListHref(pathname, currentParams, overrides)` — merges new params over
  current ones, drops empty values.
- `components/dashboard/table-search.tsx` — a plain GET `<form>` with hidden inputs carrying the
  other current params through.
- `components/dashboard/sortable-head.tsx` — a `<TableHead>` link that toggles `sort`/`dir`.
- `components/dashboard/clickable-table-row.tsx` — wraps `TableRow` with an `onClick` router
  push so the **entire row** navigates, not just linked text. Use this for any new list table,
  don't go back to per-cell `<Link>` wrapping.
- Sorting happens entirely in JS after fetch (not `.order()` in the query), since sorting by the
  separately-fetched customer-name join can't be pushed into a single query.

**Mobile card view (invoices only)**: the invoices table has 5 columns, too many for a 375px
viewport. `components/dashboard/invoice-list-item.tsx` (`InvoiceListItem`) renders both a
`sm:hidden` stacked card and a `hidden sm:block` table row from one shared component, also used
by the dashboard's "Due soon" list, so all three surfaces render invoices identically. The
customers list (3 columns) doesn't need this, it uses a small-avatar-initial treatment in the
Name cell instead.

**Due-date urgency**: `lib/reminders.ts`'s `dueStatusLabel(daysUntilDue, t)` renders "3 days
left" / "Due today" / "2 days overdue" (ICU plural) next to raw due dates, shown only when
`status === "unpaid"`. Every call site takes `daysUntil(dueDate)` from `lib/format.ts`, don't
recompute the day-math differently at a new call site.
