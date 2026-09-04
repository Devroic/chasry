import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

import { EMAIL_BRAND as BRAND } from "@/emails/components/brand";
import { SUPPORT_EMAIL } from "@/lib/constants";

// Re-asserts light colors under prefers-color-scheme to stop Gmail's dark mode inversion.
const DARK_MODE_OVERRIDE = `
  @media (prefers-color-scheme: dark) {
    .chasry-body { background-color: #F4F6FB !important; }
    .chasry-card { background-color: #FFFFFF !important; border-color: ${BRAND.border} !important; }
    .chasry-heading, .chasry-text { color: ${BRAND.ink} !important; }
    .chasry-footer, .chasry-footer a { color: ${BRAND.neutral} !important; }
    .chasry-button { background-color: ${BRAND.primary} !important; color: #FFFFFF !important; }
  }
`;

// Layout for lifecycle emails — mirrors ReminderLayout's card styling with the mascot logo.
export function AccountLayout({
  previewText,
  appUrl,
  children,
}: {
  previewText: string;
  appUrl: string;
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
          <Img
            src={`${appUrl}/brand/icon-512.png`}
            width="48"
            height="48"
            alt="Chasry"
            style={{ display: "block", marginBottom: "24px" }}
          />

          {children}

          <Hr style={{ borderColor: BRAND.border, margin: "28px 0 16px" }} />
          <Text className="chasry-footer" style={{ fontSize: "12px", color: BRAND.neutral, margin: 0 }}>
            Need help? Contact us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: BRAND.neutral, textDecoration: "underline" }}>
              {SUPPORT_EMAIL}
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function AccountHeading({ children }: { children: React.ReactNode }) {
  return (
    <Heading className="chasry-heading" style={{ fontSize: "20px", color: BRAND.ink, margin: "0 0 12px" }}>
      {children}
    </Heading>
  );
}

export function AccountText({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="chasry-text"
      style={{ fontSize: "15px", lineHeight: "24px", color: BRAND.ink, margin: "0 0 20px" }}
    >
      {children}
    </Text>
  );
}

export function AccountButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ margin: "0 0 4px" }}>
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
        {children}
      </Button>
    </Section>
  );
}
