import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_TONES } from "@/components/status-tones";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: { absolute: "Email health · Chasry Admin" } };

// Resend free-tier quotas. Every to/cc/bcc recipient counts separately.
const RESEND_DAILY_LIMIT = 100;
const RESEND_MONTHLY_LIMIT = 3000;

/** How stale the daily sweep may be before it's flagged (it runs daily at 07:00 UTC). */
const SWEEP_STALE_MS = 26 * 60 * 60 * 1000;

function utcDayOf(iso: string) {
  return iso.slice(0, 10);
}

export default async function AdminEmailsPage() {
  // Layout guards don't cover RSC page-segment requests; every admin page gates itself.
  await requireAdmin();
  const t = await getTranslations("admin.emails");
  const tOffset = await getTranslations("offsetPicker");
  const locale = await getLocale();
  // Same wording as the invoice detail timeline.
  const offsetLabel = (days: number) =>
    days === 0
      ? tOffset("onDueDateOption")
      : days < 0
        ? tOffset("daysBeforeDue", { days: Math.abs(days) })
        : tOffset("daysAfterDue", { days });
  const supabase = createAdminClient();

  const now = new Date();
  const todayUtc = now.toISOString().slice(0, 10);
  const monthStartIso = `${todayUtc.slice(0, 7)}-01T00:00:00Z`;
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  // One window covering both the calendar month and the trailing week.
  const windowStartIso =
    new Date(monthStartIso).getTime() < now.getTime() - 7 * 86_400_000
      ? monthStartIso
      : sevenDaysAgoIso;

  const [
    { data: logs },
    { data: settings },
    { data: profiles },
    { data: accountEmails },
    { data: lastSweepRun },
    { data: lastDigestRun },
  ] = await Promise.all([
    supabase
      .from("reminder_logs")
      .select("user_id, invoice_id, offset_days, status, sent_at")
      .gte("sent_at", windowStartIso)
      .order("sent_at", { ascending: false }),
    supabase.from("reminder_settings").select("user_id, copy_self"),
    supabase.from("profiles").select("id, business_name, email"),
    supabase
      .from("email_log")
      .select("recipient_count, sent_at")
      .gte("sent_at", windowStartIso),
    supabase
      .from("cron_runs")
      .select("ran_at, sent, failed, skipped")
      .eq("job", "send-reminders")
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("cron_runs")
      .select("ran_at, sent")
      .eq("job", "weekly-digest")
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const copySelf = new Set((settings ?? []).filter((s) => s.copy_self).map((s) => s.user_id));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Recipient count: each sent reminder is one email, plus a BCC copy when the owner
  // has "send me a copy" on, plus digests, plus everything in email_log (welcome,
  // billing, notices, preview batches). Only Supabase's own auth emails are absent.
  const monthStartMs = new Date(monthStartIso).getTime();
  let recipientsToday = 0;
  let recipientsMonth = 0;
  for (const log of logs ?? []) {
    if (log.status !== "sent") continue;
    const weight = copySelf.has(log.user_id) ? 2 : 1;
    if (new Date(log.sent_at).getTime() >= monthStartMs) recipientsMonth += weight;
    if (utcDayOf(log.sent_at) === todayUtc) recipientsToday += weight;
  }
  // Digests are in email_log too (kind "digest"), so they're covered below.
  for (const entry of accountEmails ?? []) {
    if (new Date(entry.sent_at).getTime() >= monthStartMs) recipientsMonth += entry.recipient_count;
    if (utcDayOf(entry.sent_at) === todayUtc) recipientsToday += entry.recipient_count;
  }

  // The cron_runs heartbeat distinguishes "ran but nothing was due" from "didn't run";
  // reminder_logs alone left quiet days looking stale.
  const lastSweepDay = lastSweepRun ? utcDayOf(lastSweepRun.ran_at) : null;
  const sweepCounts = {
    sent: lastSweepRun?.sent ?? 0,
    failed: lastSweepRun?.failed ?? 0,
    skipped: lastSweepRun?.skipped ?? 0,
  };
  const sweepStale = lastSweepRun
    ? now.getTime() - new Date(lastSweepRun.ran_at).getTime() > SWEEP_STALE_MS
    : false;

  const lastDigestIso = lastDigestRun?.ran_at ?? null;
  const lastDigestCount = lastDigestRun?.sent ?? 0;

  const failedLogs = (logs ?? []).filter(
    (l) => l.status === "failed" && new Date(l.sent_at).getTime() >= new Date(sevenDaysAgoIso).getTime()
  );
  const failedInvoiceIds = [...new Set(failedLogs.map((l) => l.invoice_id))];
  const { data: failedInvoices } = failedInvoiceIds.length
    ? await supabase.from("invoices").select("id, invoice_number").in("id", failedInvoiceIds)
    : { data: [] };
  const invoiceNumberById = new Map((failedInvoices ?? []).map((i) => [i.id, i.invoice_number]));

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("subtitle")} className="mb-0" />

      <div className="grid gap-4 sm:grid-cols-2">
        <QuotaCard
          label={t("quotaToday")}
          used={recipientsToday}
          limit={RESEND_DAILY_LIMIT}
          hint={t("quotaHint")}
        />
        <QuotaCard
          label={t("quotaMonth")}
          used={recipientsMonth}
          limit={RESEND_MONTHLY_LIMIT}
          hint={t("quotaHint")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("lastSweep")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastSweepDay ? (
              <>
                <p className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                  {formatDate(lastSweepDay, locale)}
                  {sweepStale && (
                    <Badge variant="outline" className={STATUS_TONES.warning}>
                      {t("sweepStale")}
                    </Badge>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("sweepCounts", sweepCounts)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noSweepYet")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("lastDigest")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastDigestIso ? (
              <>
                <p className="text-2xl font-semibold text-foreground">
                  {formatDate(lastDigestIso, locale)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("digestCount", { count: lastDigestCount })}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noDigestYet")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("failedTitle")}</h2>
        {failedLogs.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              {t("noFailures")}
            </CardContent>
          </Card>
        ) : (
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnWhen")}</TableHead>
                  <TableHead>{t("columnUser")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("columnInvoice")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("columnStep")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedLogs.map((log) => {
                  const owner = profileById.get(log.user_id);
                  return (
                    <TableRow key={`${log.invoice_id}-${log.offset_days}-${log.sent_at}`}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(log.sent_at, locale)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/users/${log.user_id}`}
                          className="font-medium text-brand-primary hover:underline"
                        >
                          {owner?.business_name || owner?.email || log.user_id}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {invoiceNumberById.get(log.invoice_id) || "—"}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {offsetLabel(log.offset_days)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </div>
  );
}

function QuotaCard({
  label,
  used,
  limit,
  hint,
}: {
  label: string;
  used: number;
  limit: number;
  hint: string;
}) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "text-2xl font-semibold",
            pct >= 90 ? "text-destructive" : "text-foreground"
          )}
        >
          {used}
          <span className="text-base font-normal text-muted-foreground"> / {limit}</span>
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct >= 90
                ? "bg-destructive"
                : pct >= 75
                  ? "bg-amber-500"
                  : "bg-brand-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
