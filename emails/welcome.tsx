import * as React from "react";
import { AccountLayout, AccountHeading, AccountText, AccountButton } from "./components/account-layout";

export default function WelcomeEmail({ appUrl }: { appUrl: string }) {
  return (
    <AccountLayout previewText="Welcome to Chasry" appUrl={appUrl}>
      <AccountHeading>Welcome to Chasry</AccountHeading>
      <AccountText>
        Your account is ready. Log your first unpaid invoice and Chasry will start chasing
        payment for you automatically.
      </AccountText>
      <AccountButton href={`${appUrl}/dashboard`}>Go to dashboard</AccountButton>
    </AccountLayout>
  );
}
