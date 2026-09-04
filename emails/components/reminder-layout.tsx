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
import { emailCopy } from "@/emails/copy";
import type { Locale } from "@/lib/locale";

import { EMAIL_BRAND as BRAND } from "@/emails/components/brand";

// color-scheme meta tags alone don't stop Gmail's dark mode inversion — re-asserting
// the same light colors inside a real prefers-color-scheme media query with !important does.
const DARK_MODE_OVERRIDE = `
  @media (prefers-color-scheme: dark) {
    .chasry-body { background-color: #F4F6FB !important; }
    .chasry-card { background-color: #FFFFFF !important; border-color: ${BRAND.border} !important; }
    .chasry-eyebrow { color: ${BRAND.primary} !important; }
    .chasry-heading, .chasry-text { color: ${BRAND.ink} !important; }
    .chasry-footer, .chasry-summary-label { color: ${BRAND.neutral} !important; }
    .chasry-footer-brand { color: ${BRAND.primary} !important; }
    .chasry-summary { background-color: ${BRAND.tint} !important; }
    .chasry-summary-amount { color: ${BRAND.primary} !important; }
    .chasry-button { background-color: ${BRAND.primary} !important; color: #FFFFFF !important; }
  }
`;

export function ReminderLayout({
  previewText,
  businessName,
  locale = "en",
  showBranding = true,
  claimUrl,
  children,
}: {
  previewText: string;
  businessName: string;
  locale?: Locale;
  /** Free plan: "via Chasry" footer with a link. Pro: brand-free footer. */
  showBranding?: boolean;
  /** Signed "I've paid" link for the client; omitted when signing isn't configured. */
  claimUrl?: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <style>{DARK_MODE_OVERRIDE}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body
        className="chasry-body"
        style={{
          backgroundColor: "#F4F6FB",
          fontFamily: "Helvetica, Arial, sans-serif",
          margin: 0,
          padding: "32px 16px",
        }}
      >
        <Container
          className="chasry-card"
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
            className="chasry-eyebrow"
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
          {claimUrl && (
            <Text className="chasry-footer" style={{ fontSize: "12px", color: BRAND.neutral, margin: "0 0 10px" }}>
              {emailCopy.claimPaidQuestion(locale)}{" "}
              <a href={claimUrl} style={{ color: BRAND.primary, textDecoration: "underline" }}>
                {emailCopy.claimPaidLink(businessName, locale)}
              </a>
            </Text>
          )}
          <Text className="chasry-footer" style={{ fontSize: "12px", color: BRAND.neutral, margin: 0 }}>
            {showBranding ? (
              <>
                {emailCopy.footerPrefix(businessName, locale)}
                <a
                  href="https://chasry.com?utm_source=reminder&utm_medium=email"
                  className="chasry-footer-brand"
                  style={{ color: BRAND.primary, fontWeight: 600, textDecoration: "none" }}
                >
                  Chasry
                </a>
                {emailCopy.footerSuffix(businessName, locale)}
              </>
            ) : (
              emailCopy.footerNoBrand(businessName, locale)
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function ReminderHeading({ children }: { children: React.ReactNode }) {
  return (
    <Heading className="chasry-heading" style={{ fontSize: "20px", color: BRAND.ink, margin: "0 0 12px" }}>
      {children}
    </Heading>
  );
}

export function ReminderText({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="chasry-text"
      style={{ fontSize: "15px", lineHeight: "24px", color: BRAND.ink, margin: "0 0 16px" }}
    >
      {children}
    </Text>
  );
}

export function InvoiceSummary({
  invoiceNumber,
  amount,
  dueDateLabel,
  locale = "en",
}: {
  invoiceNumber?: string;
  amount: string;
  dueDateLabel: string;
  locale?: Locale;
}) {
  return (
    <Section
      className="chasry-summary"
      style={{
        backgroundColor: BRAND.tint,
        borderRadius: "10px",
        padding: "18px 20px",
        margin: "0 0 20px",
      }}
    >
      {invoiceNumber && (
        <Text className="chasry-summary-label" style={{ fontSize: "13px", color: BRAND.neutral, margin: "0 0 4px" }}>
          {emailCopy.invoiceLabel(invoiceNumber, locale)}
        </Text>
      )}
      <Text
        className="chasry-summary-amount"
        style={{ fontSize: "26px", fontWeight: 700, color: BRAND.primary, margin: "0 0 4px" }}
      >
        {amount}
      </Text>
      <Text className="chasry-summary-label" style={{ fontSize: "13px", color: BRAND.neutral, margin: 0 }}>
        {dueDateLabel}
      </Text>
    </Section>
  );
}

export function PayNowButton({ href, locale = "en" }: { href: string; locale?: Locale }) {
  return (
    <Section style={{ margin: "0 0 20px" }}>
      <Button
        href={href}
        className="chasry-button"
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
        {emailCopy.payNow(locale)}
      </Button>
    </Section>
  );
}
