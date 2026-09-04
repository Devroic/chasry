import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { EmptyMessage } from "@/components/empty-message";
import { TabLink } from "@/components/tab-link";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { SortableHead } from "@/components/sortable-head";
import { TableSearch } from "@/components/table-search";
import { InvoiceStatusBadge, invoiceDisplayStatus } from "@/components/dashboard/invoice-status-badge";
import { InvoiceListItem } from "@/components/dashboard/invoice-list-item";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildListHref, paginate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney, daysUntil } from "@/lib/format";
import { getUserTimeZone } from "@/lib/timezone";
import { dueStatusLabel } from "@/lib/reminders";

export const metadata = { title: "Invoices" };

const FILTERS = ["all", "unpaid", "overdue", "paid"] as const;

const SORT_FIELDS = ["client", "due", "amount", "status"] as const;
type SortField = (typeof SORT_FIELDS)[number];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const { filter = "all", q = "", sort = "due", dir = "asc", page: pageParam } = await searchParams;
  const sortField: SortField = SORT_FIELDS.includes(sort as SortField) ? (sort as SortField) : "due";
  const sortDir: "asc" | "desc" = dir === "desc" ? "desc" : "asc";
  const { supabase, user } = await requireUser();
  const t = await getTranslations("invoices");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const timeZone = await getUserTimeZone();
  const filterLabels: Record<(typeof FILTERS)[number], string> = {
    all: t("filterAll"),
    unpaid: t("filterUnpaid"),
    overdue: t("filterOverdue"),
    paid: t("filterPaid"),
  };

  // One parallel batch: the name lookup only needs user.id, not the invoice list.
  const [{ data: invoicesRaw }, { data: customers }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, amount, currency, due_date, status, customer_id")
      .eq("user_id", user.id),
    supabase.from("customers").select("id, name").eq("user_id", user.id),
  ]);

  const invoices = invoicesRaw ?? [];
  const customerName = new Map((customers ?? []).map((c) => [c.id, c.name]));

  const query = q.trim().toLowerCase();
  const filtered = invoices.filter((invoice) => {
    const display = invoiceDisplayStatus(invoice.status, invoice.due_date, timeZone);
    if (filter !== "all") {
      const matchesFilter = filter === "unpaid" ? invoice.status === "unpaid" : display === filter;
      if (!matchesFilter) return false;
    }
    if (!query) return true;
    const client = (customerName.get(invoice.customer_id) ?? "").toLowerCase();
    return client.includes(query) || (invoice.invoice_number ?? "").toLowerCase().includes(query);
  });

  const sortMultiplier = sortDir === "asc" ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    switch (sortField) {
      case "client":
        return (
          sortMultiplier *
          (customerName.get(a.customer_id) ?? "").localeCompare(customerName.get(b.customer_id) ?? "")
        );
      case "amount":
        return sortMultiplier * (Number(a.amount) - Number(b.amount));
      case "status":
        return (
          sortMultiplier *
          invoiceDisplayStatus(a.status, a.due_date, timeZone).localeCompare(
            invoiceDisplayStatus(b.status, b.due_date, timeZone)
          )
        );
      case "due":
      default:
        return sortMultiplier * (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0);
    }
  });

  const currentParams = { filter, q, sort, dir };
  function sortHref(field: SortField) {
    const nextDir = sortField === field && sortDir === "asc" ? "desc" : "asc";
    return buildListHref("/invoices", currentParams, { sort: field, dir: nextDir });
  }

  const { items: paginated, page, totalPages } = paginate(sorted, pageParam);

  return (
    <div>
      <PageHeader
        title={t("listTitle")}
        description={t("listSubtitle")}
        action={
          <Button asChild>
            <Link href="/invoices/new">
              <Plus /> {t("addInvoice")}
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* overflow-x-auto: the four Greek labels exceed a 375px viewport. */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border sm:border-b-0">
          {FILTERS.map((f) => (
            <TabLink
              key={f}
              href={buildListHref("/invoices", currentParams, { filter: f === "all" ? undefined : f })}
              active={filter === f}
              className="whitespace-nowrap"
            >
              {filterLabels[f]}
            </TabLink>
          ))}
        </nav>
        <TableSearch
          action="/invoices"
          placeholder={t("searchPlaceholder")}
          defaultValue={q}
          hiddenParams={{ filter: filter === "all" ? undefined : filter, sort, dir }}
        />
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          actionLabel={t("emptyCta")}
          actionHref="/invoices/new"
        />
      ) : sorted.length === 0 ? (
        <EmptyMessage>{t("noResults")}</EmptyMessage>
      ) : (
        <>
          {/* Mobile shows stacked cards; the 5-column table would scroll horizontally. */}
          <Card className="p-0 sm:hidden">
            <div className="divide-y divide-border">
              {paginated.map((invoice) => (
                <InvoiceListItem
                  key={invoice.id}
                  id={invoice.id}
                  customerName={customerName.get(invoice.customer_id) ?? t("clientFallback")}
                  invoiceNumber={invoice.invoice_number}
                  dueDate={invoice.due_date}
                  amount={Number(invoice.amount)}
                  currency={invoice.currency}
                  status={invoice.status}
                />
              ))}
            </div>
          </Card>

          <Card className="hidden p-0 sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label={t("columnClient")}
                    active={sortField === "client"}
                    dir={sortDir}
                    href={sortHref("client")}
                  />
                  <TableHead>{t("columnInvoiceNumber")}</TableHead>
                  <SortableHead
                    label={t("columnDue")}
                    active={sortField === "due"}
                    dir={sortDir}
                    href={sortHref("due")}
                  />
                  <SortableHead
                    label={t("columnAmount")}
                    active={sortField === "amount"}
                    dir={sortDir}
                    href={sortHref("amount")}
                  />
                  <SortableHead
                    label={t("columnStatus")}
                    active={sortField === "status"}
                    dir={sortDir}
                    href={sortHref("status")}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((invoice) => (
                  <ClickableTableRow
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    label={[customerName.get(invoice.customer_id) ?? t("clientFallback"), invoice.invoice_number].filter(Boolean).join(" ")}
                  >
                    <TableCell className="font-medium">
                      {customerName.get(invoice.customer_id) ?? t("clientFallback")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.invoice_number || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>{formatDate(invoice.due_date, locale)}</div>
                      {invoice.status === "unpaid" && (
                        <div className="text-xs">
                          {dueStatusLabel(daysUntil(invoice.due_date, timeZone), t)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatMoney(Number(invoice.amount), invoice.currency)}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} dueDate={invoice.due_date} />
                    </TableCell>
                  </ClickableTableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          navLabel={tCommon("pagination")}
          previousLabel={tCommon("previous")}
          nextLabel={tCommon("next")}
          buildHref={(p) => buildListHref("/invoices", currentParams, { page: String(p) })}
        />
      )}
    </div>
  );
}
