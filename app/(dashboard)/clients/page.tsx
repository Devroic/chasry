import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { EmptyMessage } from "@/components/empty-message";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { SortableHead } from "@/components/sortable-head";
import { TableSearch } from "@/components/table-search";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildListHref, paginate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Clients" };

const SORT_FIELDS = ["name", "email", "unpaid"] as const;
type SortField = (typeof SORT_FIELDS)[number];

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const { q = "", sort = "name", dir = "asc", page: pageParam } = await searchParams;
  const sortField: SortField = SORT_FIELDS.includes(sort as SortField) ? (sort as SortField) : "name";
  const sortDir: "asc" | "desc" = dir === "desc" ? "desc" : "asc";
  const { supabase, user } = await requireUser();
  const t = await getTranslations("customers");
  const tCommon = await getTranslations("common");

  const [{ data: customersRaw }, { data: unpaidRaw }] = await Promise.all([
    supabase.from("customers").select("id, name, email").eq("user_id", user.id),
    supabase.from("invoices").select("customer_id").eq("user_id", user.id).eq("status", "unpaid"),
  ]);

  const unpaidCounts = new Map<string, number>();
  for (const invoice of unpaidRaw ?? []) {
    unpaidCounts.set(invoice.customer_id, (unpaidCounts.get(invoice.customer_id) ?? 0) + 1);
  }

  const customers = (customersRaw ?? []).map((c) => ({ ...c, unpaid: unpaidCounts.get(c.id) ?? 0 }));
  const query = q.trim().toLowerCase();
  const filtered = query
    ? customers.filter(
        (c) => c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
      )
    : customers;

  const sortMultiplier = sortDir === "asc" ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    switch (sortField) {
      case "email":
        return sortMultiplier * a.email.localeCompare(b.email);
      case "unpaid":
        return sortMultiplier * (a.unpaid - b.unpaid) || a.name.localeCompare(b.name);
      case "name":
      default:
        return sortMultiplier * a.name.localeCompare(b.name);
    }
  });

  const currentParams = { q, sort, dir };
  function sortHref(field: SortField) {
    // Counts start highest-first; text columns start A to Z.
    const nextDir =
      sortField === field ? (sortDir === "asc" ? "desc" : "asc") : field === "unpaid" ? "desc" : "asc";
    return buildListHref("/clients", currentParams, { sort: field, dir: nextDir });
  }

  const { items: paginated, page, totalPages } = paginate(sorted, pageParam);

  return (
    <div>
      <PageHeader
        title={t("listTitle")}
        description={t("listSubtitle")}
        action={
          <Button asChild>
            <Link href="/clients/new">
              <Plus /> {t("addClient")}
            </Link>
          </Button>
        }
      />

      {customers.length > 0 && (
        <div className="mb-4 flex justify-end">
          <TableSearch
            action="/clients"
            placeholder={t("searchPlaceholder")}
            defaultValue={q}
            hiddenParams={{ sort, dir }}
          />
        </div>
      )}

      {customers.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          actionLabel={t("emptyCta")}
          actionHref="/clients/new"
        />
      ) : sorted.length === 0 ? (
        <EmptyMessage>{t("noSearchResults")}</EmptyMessage>
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label={t("columnName")}
                  active={sortField === "name"}
                  dir={sortDir}
                  href={sortHref("name")}
                />
                <SortableHead
                  label={t("columnEmail")}
                  active={sortField === "email"}
                  dir={sortDir}
                  href={sortHref("email")}
                />
                <SortableHead
                  label={t("columnUnpaid")}
                  active={sortField === "unpaid"}
                  dir={sortDir}
                  href={sortHref("unpaid")}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((customer) => (
                <ClickableTableRow key={customer.id} href={`/clients/${customer.id}`} label={customer.name}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-primary-tint text-xs font-semibold text-brand-primary">
                        {customer.name.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                      {customer.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                  <TableCell className={customer.unpaid > 0 ? "font-medium" : "text-muted-foreground"}>
                    {customer.unpaid}
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          navLabel={tCommon("pagination")}
          previousLabel={tCommon("previous")}
          nextLabel={tCommon("next")}
          buildHref={(p) => buildListHref("/clients", currentParams, { page: String(p) })}
        />
      )}
    </div>
  );
}
