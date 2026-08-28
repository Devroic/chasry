import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ClickableTableRow } from "@/components/dashboard/clickable-table-row";
import { SortableHead } from "@/components/dashboard/sortable-head";
import { TableSearch } from "@/components/dashboard/table-search";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildListHref } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Clients" };

const SORT_FIELDS = ["name", "email", "added"] as const;
type SortField = (typeof SORT_FIELDS)[number];

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string }>;
}) {
  const { q = "", sort = "added", dir = "desc" } = await searchParams;
  const sortField: SortField = SORT_FIELDS.includes(sort as SortField) ? (sort as SortField) : "added";
  const sortDir: "asc" | "desc" = dir === "asc" ? "asc" : "desc";
  const { supabase, user } = await requireUser();
  const t = await getTranslations("customers");

  const { data: customersRaw } = await supabase
    .from("customers")
    .select("id, name, email, phone, created_at")
    .eq("user_id", user.id);

  const customers = customersRaw ?? [];
  const query = q.trim().toLowerCase();
  const filtered = query
    ? customers.filter(
        (c) => c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
      )
    : customers;

  const sortMultiplier = sortDir === "asc" ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    switch (sortField) {
      case "name":
        return sortMultiplier * a.name.localeCompare(b.name);
      case "email":
        return sortMultiplier * a.email.localeCompare(b.email);
      case "added":
      default:
        return sortMultiplier * (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0);
    }
  });

  const currentParams = { q, sort, dir };
  function sortHref(field: SortField) {
    const nextDir = sortField === field && sortDir === "asc" ? "desc" : "asc";
    return buildListHref("/customers", currentParams, { sort: field, dir: nextDir });
  }

  return (
    <div>
      <PageHeader
        title={t("listTitle")}
        description={t("listSubtitle")}
        action={
          <Button asChild>
            <Link href="/customers/new">
              <Plus /> {t("addClient")}
            </Link>
          </Button>
        }
      />

      {customers.length > 0 && (
        <div className="mb-4 flex justify-end">
          <TableSearch
            action="/customers"
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
          actionHref="/customers/new"
        />
      ) : sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t("noSearchResults")}
        </p>
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
                <TableHead className="hidden sm:table-cell">{t("columnPhone")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((customer) => (
                <ClickableTableRow key={customer.id} href={`/customers/${customer.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-primary-tint text-xs font-semibold text-brand-primary">
                        {customer.name.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                      {customer.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {customer.phone || "—"}
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
