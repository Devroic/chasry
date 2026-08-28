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

const BRAND = {
  primary: "#23458D",
  ink: "#0D0D0D",
  neutral: "#5B6B85",
  border: "#E3E8F2",
};

const SUPPORT_EMAIL = "info@chasry.com";

// The color-scheme meta tags alone aren't enough, Gmail in particular is
// well known for ignoring them and inverting colors anyway based on its own
// luminosity analysis. What actually holds against that is re-asserting the
// exact same light colors inside a real `prefers-color-scheme: dark` media
// query with `!important`, since that's the one signal Gmail's dark mode
// reliably respects, an explicit "I've already accounted for dark mode,
// here's what I want" rather than a passive opt-out.
const DARK_MODE_OVERRIDE = `
  @media (prefers-color-scheme: dark) {
    .chasry-body { background-color: #F4F6FB !important; }
    .chasry-card { background-color: #FFFFFF !important; border-color: ${BRAND.border} !important; }
    .chasry-heading, .chasry-text { color: ${BRAND.ink} !important; }
    .chasry-footer, .chasry-footer a { color: ${BRAND.neutral} !important; }
    .chasry-button { background-color: ${BRAND.primary} !important; color: #FFFFFF !important; }
  }
`;

/**
 * Layout for the two Chasry-to-subscriber lifecycle emails (welcome,
 * upgraded to Pro), mirroring ReminderLayout's card styling but with the
 * mascot logo and "need help" footer used by the Supabase-managed auth
 * emails (confirm signup, reset password), instead of ReminderLayout's
 * per-business eyebrow and "sent on behalf of" footer, which don't apply
 * here since these emails come from Chasry itself, not through a freelancer
 * to their client.
 */
export function AccountLayout({
  previewText,
  children,
}: {
  previewText: string;
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
            src="https://chasry.com/assets/img/icon.png"
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
