import { Button, Section, Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./layout";

// T6.2 — sent ~7 days before an unbooked appointment's due date.
export function DueSoonEmail({
  serviceName,
  spotName,
  dueDate,
  bookUrl,
  unsubscribeUrl,
}: {
  serviceName: string;
  spotName: string;
  dueDate: string;
  bookUrl: string;
  unsubscribeUrl?: string;
}) {
  return (
    <EmailShell
      preview={`${serviceName} at ${spotName} is due soon`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={emailStyles.heading}>Time to book {serviceName}</Text>
      <Text style={emailStyles.text}>
        Your {serviceName} at <strong>{spotName}</strong> is due around{" "}
        <strong>{dueDate}</strong>.
      </Text>
      <Text style={emailStyles.muted}>Tap below to book it now.</Text>
      <Section>
        <Button href={bookUrl} style={emailStyles.button}>
          Book now
        </Button>
      </Section>
    </EmailShell>
  );
}
