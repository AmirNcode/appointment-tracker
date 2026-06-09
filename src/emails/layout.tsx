import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};
const container = { margin: "0 auto", padding: "32px 24px", maxWidth: "480px" };
const footerText = { color: "#9ca3af", fontSize: "12px", lineHeight: "18px" };

export const emailStyles = {
  heading: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 12px",
  },
  text: { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 8px" },
  muted: { fontSize: "14px", color: "#6b7280", margin: "0 0 16px" },
  button: {
    display: "inline-block",
    backgroundColor: "#111827",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    padding: "12px 20px",
    borderRadius: "8px",
  },
};

export function EmailShell({
  preview,
  children,
  unsubscribeUrl,
}: {
  preview: string;
  children: ReactNode;
  unsubscribeUrl?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {children}
          <Hr style={{ borderColor: "#e5e7eb", margin: "28px 0 16px" }} />
          <Text style={footerText}>
            Beauty Scheduler
            {unsubscribeUrl ? (
              <>
                {" · "}
                <Link
                  href={unsubscribeUrl}
                  style={{ color: "#9ca3af", textDecoration: "underline" }}
                >
                  Unsubscribe from reminders
                </Link>
              </>
            ) : null}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
