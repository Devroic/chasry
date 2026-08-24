import { createAdminClient } from "@/lib/supabase/admin";
import { ClickableTableRow } from "@/components/dashboard/clickable-table-row";
import { SortableHead } from "@/components/dashboard/sortable-head";
import { TableSearch } from "@/components/dashboard/table-search";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buildListHref } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Users" };

const SORT_FIELDS = ["name", "email", "status", "joined"] as const;
type SortField = (typeof SORT_FIELDS)[number];

const STATUS_LABEL: Record<string, string> = {
  active: "Pro",
  past_due: "Past due",
  canceled: "Canceled",
  none: "Free",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  past_due: "bg-red-50 text-red-700 border-red-200",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string }>;
}) {
  const { q = "", sort = "joined", dir = "desc" } = await searchParams;
  const sortField: SortField = SORT_FIELDS.includes(sort as SortField) ? (sort as SortField) : "joined";
  const sortDir: "asc" | "desc" = dir === "asc" ? "asc" : "desc";

  const supabase = createAdminClient();
  const [{ data: profilesRaw }, { data: invoicesRaw }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, business_name, email, subscription_status, current_period_end, created_at"),
    supabase.from("invoices").select("user_id").eq("status", "unpaid"),
  ]);

  const activeInvoiceCounts = new Map<string, number>();
  for (const invoice of invoicesRaw ?? []) {
    activeInvoiceCounts.set(invoice.user_id, (activeInvoiceCounts.get(invoice.user_id) ?? 0) + 1);
  }

  const profiles = profilesRaw ?? [];
  const query = q.trim().toLowerCase();
  const filtered = query
    ? profiles.filter(
        (p) =>
          (p.business_name ?? "").toLowerCase().includes(query) || p.email.toLowerCase().includes(query)
      )
    : profiles;

  const sortMultiplier = sortDir === "asc" ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    switch (sortField) {
      case "name":
        return sortMultiplier * (a.business_name ?? "").localeCompare(b.business_name ?? "");
      case "email":
        return sortMultiplier * a.email.localeCompare(b.email);
      case "status":
        return sortMultiplier * a.subscription_status.localeCompare(b.subscription_status);
      case "joined":
      default:
        return sortMultiplier * (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0);
    }
  });

  const currentParams = { q, sort, dir };
  function sortHref(field: SortField) {
    const nextDir = sortField === field && sortDir === "asc" ? "desc" : "asc";
    return buildListHref("/admin/users", currentParams, { sort: field, dir: nextDir });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">{profiles.length} registered</p>
        </div>
        <TableSearch
          action="/admin/users"
          placeholder="Search by name or email"
          defaultValue={q}
          hiddenParams={{ sort, dir }}
        />
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No matching users.
        </p>
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Name" active={sortField === "name"} dir={sortDir} href={sortHref("name")} />
                <SortableHead
                  label="Email"
                  active={sortField === "email"}
                  dir={sortDir}
                  href={sortHref("email")}
                  className="hidden sm:table-cell"
                />
                <SortableHead
                  label="Plan"
                  active={sortField === "status"}
                  dir={sortDir}
                  href={sortHref("status")}
                />
                <TableHead className="hidden md:table-cell">Active invoices</TableHead>
                <SortableHead
                  label="Joined"
                  active={sortField === "joined"}
                  dir={sortDir}
                  href={sortHref("joined")}
                  className="hidden md:table-cell"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((profile) => (
                <ClickableTableRow key={profile.id} href={`/admin/users/${profile.id}`}>
                  <TableCell className="font-medium">{profile.business_name || "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {profile.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_STYLE[profile.subscription_status]}>
                      {STATUS_LABEL[profile.subscription_status] ?? profile.subscription_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {activeInvoiceCounts.get(profile.id) ?? 0}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatDate(profile.created_at)}
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
