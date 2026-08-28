import * as React from "react";
import { AccountLayout, AccountHeading, AccountText, AccountButton } from "./components/account-layout";

export default function SubscriptionCanceledEmail({
  appUrl,
  accessUntil,
}: {
  appUrl: string;
  accessUntil: string;
}) {
  return (
    <AccountLayout previewText="Your Chasry Pro subscription is canceled">
      <AccountHeading>Sorry to see you go</AccountHeading>
      <AccountText>
        Your Pro subscription is canceled. You will keep unlimited invoices and clients until{" "}
        {accessUntil}, after that your account moves to the Free plan. Changed your mind? You can
        resubscribe anytime from Settings.
      </AccountText>
      <AccountButton href={`${appUrl}/settings/billing`}>View billing</AccountButton>
    </AccountLayout>
  );
}
