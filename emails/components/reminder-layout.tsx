import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

const BRAND = {
  primary: "#23458D",
  ink: "#0D0D0D",
  neutral: "#5B6B85",
  tint: "#E2E9F8",
  border: "#E3E8F2",
};

export function ReminderLayout({
  previewText,
  businessName,
  children,
}: {
  previewText: string;
  businessName: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: "#F4F6FB", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#FFFFFF",
            margin: "0 auto",
            padding: "32px",
            maxWidth: "480px",
            borderRadius: "12px",
            border: `1px solid ${BRAND.border}`,
          }}
        >
          <Text
            style={{
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: BRAND.primary,
              margin: "0 0 20px",
            }}
          >
            {businessName}
          </Text>

          {children}

          <Hr style={{ borderColor: BRAND.border, margin: "28px 0 16px" }} />
          <Text style={{ fontSize: "12px", color: BRAND.neutral, margin: 0 }}>
            This is an automatic payment reminder sent on behalf of {businessName} via{" "}
            <span style={{ color: BRAND.primary, fontWeight: 600 }}>Chasry</span>. Just reply to
            this email to reach {businessName} directly.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function ReminderHeading({ children }: { children: React.ReactNode }) {
  return (
    <Heading style={{ fontSize: "20px", color: BRAND.ink, margin: "0 0 12px" }}>
      {children}
    </Heading>
  );
}

export function ReminderText({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: "15px", lineHeight: "24px", color: BRAND.ink, margin: "0 0 16px" }}>
      {children}
    </Text>
  );
}

export function InvoiceSummary({
  invoiceNumber,
  amount,
  dueDateLabel,
}: {
  invoiceNumber?: string;
  amount: string;
  dueDateLabel: string;
}) {
  return (
    <Section
      style={{
        backgroundColor: BRAND.tint,
        borderRadius: "10px",
        padding: "18px 20px",
        margin: "0 0 20px",
      }}
    >
      {invoiceNumber && (
        <Text style={{ fontSize: "13px", color: BRAND.neutral, margin: "0 0 4px" }}>
          Invoice {invoiceNumber}
        </Text>
      )}
      <Text style={{ fontSize: "26px", fontWeight: 700, color: BRAND.primary, margin: "0 0 4px" }}>
        {amount}
      </Text>
      <Text style={{ fontSize: "13px", color: BRAND.neutral, margin: 0 }}>{dueDateLabel}</Text>
    </Section>
  );
}

export function PayNowButton({ href }: { href: string }) {
  return (
    <Section style={{ margin: "0 0 20px" }}>
      <Button
        href={href}
        style={{
          backgroundColor: BRAND.primary,
          color: "#FFFFFF",
          fontSize: "15px",
          fontWeight: 600,
          padding: "12px 24px",
          borderRadius: "8px",
          textDecoration: "none",
        }}
      >
        Pay now
      </Button>
    </Section>
  );
}
