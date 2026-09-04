import * as React from "react";
import { Hr, Section, Text } from "@react-email/components";
import {
  AccountLayout,
  AccountHeading,
  AccountText,
  AccountButton,
} from "./components/account-layout";

import { EMAIL_BRAND as BRAND } from "./components/brand";

export interface WeeklyDigestOverdueLine {
  /** "Vermeer Consulting · INV-2026-014" */
  label: string;
  amountLabel: string;
  daysOverdue: number;
  /** Signed one-click owner action; omitted when link signing is off. */
  markPaidUrl?: string;
}

export interface WeeklyDigestProps {
  appUrl: string;
  /** "€4,370.00" (joined with " + " across currencies). */
  totalOutstandingLabel: string;
  unpaidCount: number;
  remindersSentLastWeek: number;
  overdue: WeeklyDigestOverdueLine[];
}

// English-only, like every account-lifecycle email (welcome, upgraded, canceled).
export default function WeeklyDigestEmail({
  appUrl,
  totalOutstandingLabel = "€4,370.00",
  unpaidCount = 4,
  remindersSentLastWeek = 3,
  overdue = [],
}: Partial<WeeklyDigestProps> & Pick<WeeklyDigestProps, "appUrl">) {
  return (
    <AccountLayout
      previewText={`You're owed ${totalOutstandingLabel} across ${unpaidCount} ${unpaidCount === 1 ? "invoice" : "invoices"}`}
      appUrl={appUrl}
    >
      <AccountHeading>Your week, chased for you</AccountHeading>
      <AccountText>
        You&apos;re owed <strong>{totalOutstandingLabel}</strong> across {unpaidCount}{" "}
        {unpaidCount === 1 ? "invoice" : "invoices"}.{" "}
        {remindersSentLastWeek > 0
          ? `Chasry sent ${remindersSentLastWeek} ${remindersSentLastWeek === 1 ? "reminder" : "reminders"} for you in the last 7 days.`
          : "No reminders were due in the last 7 days."}
      </AccountText>

      {overdue.length > 0 && (
        <Section
          style={{
            backgroundColor: "#FDF2F2",
            borderRadius: "10px",
            padding: "16px 20px",
            margin: "0 0 20px",
          }}
        >
          <Text style={{ fontSize: "13px", fontWeight: 700, color: "#B91C1C", margin: "0 0 8px" }}>
            Overdue
          </Text>
          {overdue.map((line) => (
            <Text key={line.label} style={{ fontSize: "14px", color: BRAND.ink, margin: "0 0 6px" }}>
              {line.label} · {line.amountLabel} ·{" "}
              {line.daysOverdue === 1 ? "1 day overdue" : `${line.daysOverdue} days overdue`}
              {line.markPaidUrl && (
                <>
                  {" · "}
                  <a href={line.markPaidUrl} style={{ color: BRAND.primary, textDecoration: "underline" }}>
                    Mark as paid
                  </a>
                </>
              )}
            </Text>
          ))}
        </Section>
      )}

      <AccountButton href={`${appUrl}/dashboard`}>Open your dashboard</AccountButton>

      <Hr style={{ borderColor: BRAND.border, margin: "24px 0 12px" }} />
      <Text style={{ fontSize: "12px", color: BRAND.neutral, margin: 0 }}>
        You get this summary once a week while you have unpaid invoices. Turn it off anytime in
        Settings → Reminders.
      </Text>
    </AccountLayout>
  );
}

// Only the `npm run email:dev` preview reads this; real sends pass getAppUrl().
WeeklyDigestEmail.PreviewProps = { appUrl: "http://localhost:3000" };
