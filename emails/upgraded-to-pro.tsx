import * as React from "react";
import { AccountLayout, AccountHeading, AccountText, AccountButton } from "./components/account-layout";
import { PRO_PRICE_LABEL } from "@/lib/plan";

export default function UpgradedToProEmail({ appUrl }: { appUrl: string }) {
  return (
    <AccountLayout previewText="You're on Chasry Pro">
      <AccountHeading>Welcome to Pro</AccountHeading>
      <AccountText>
        Thanks for upgrading, {PRO_PRICE_LABEL}. Unlimited active invoices are unlocked, manage
        your subscription anytime from Settings.
      </AccountText>
      <AccountButton href={`${appUrl}/settings/billing`}>View billing</AccountButton>
    </AccountLayout>
  );
}
