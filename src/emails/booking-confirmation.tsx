import { Button, Section, Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./layout";

// T7.3 / T7.4 — booking confirmation (with .ics attached) and, with
// `cancelled`, the cancellation notice (with a CANCEL .ics). Transactional.
export function BookingConfirmationEmail({
  serviceName,
  spotName,
  whenText,
  viewUrl,
  cancelled = false,
}: {
  serviceName: string;
  spotName: string;
  whenText: string;
  viewUrl: string;
  cancelled?: boolean;
}) {
  return (
    <EmailShell
      preview={
        cancelled
          ? `Cancelled: ${serviceName} at ${spotName}`
          : `Booked: ${serviceName} at ${spotName}`
      }
    >
      <Text style={emailStyles.heading}>
        {cancelled ? "Appointment cancelled" : "You're booked 🎉"}
      </Text>
      <Text style={emailStyles.text}>
        Your {serviceName} at <strong>{spotName}</strong>
        {cancelled
          ? ` on ${whenText} has been cancelled.`
          : ` is confirmed for ${whenText}.`}
      </Text>
      <Text style={emailStyles.muted}>
        {cancelled
          ? "The attached file removes it from your calendar."
          : "The attached calendar file adds it to your calendar — Gmail and Apple Mail show a one-tap “Add to calendar”."}
      </Text>
      <Section>
        <Button href={viewUrl} style={emailStyles.button}>
          View appointment
        </Button>
      </Section>
    </EmailShell>
  );
}
