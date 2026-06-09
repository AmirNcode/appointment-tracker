import { Button, Section, Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./layout";

// T6.2 — sent ~7 days before a confirmed (booked) appointment.
export function PreAppointmentEmail({
  serviceName,
  spotName,
  whenText,
  bookUrl,
  unsubscribeUrl,
}: {
  serviceName: string;
  spotName: string;
  whenText: string;
  bookUrl: string;
  unsubscribeUrl?: string;
}) {
  return (
    <EmailShell
      preview={`Upcoming: ${serviceName} at ${spotName}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={emailStyles.heading}>Upcoming appointment</Text>
      <Text style={emailStyles.text}>
        Your {serviceName} at <strong>{spotName}</strong> is coming up on{" "}
        <strong>{whenText}</strong>.
      </Text>
      <Text style={emailStyles.muted}>Need the details or to reschedule?</Text>
      <Section>
        <Button href={bookUrl} style={emailStyles.button}>
          View appointment
        </Button>
      </Section>
    </EmailShell>
  );
}
