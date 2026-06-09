import { Button, Section, Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./layout";

// T6.6 — welcome email sent on sign-up (transactional, no unsubscribe).
export function WelcomeEmail({
  loginUrl,
  optedIn,
}: {
  loginUrl: string;
  optedIn: boolean;
}) {
  return (
    <EmailShell preview="Welcome to Beauty Scheduler">
      <Text style={emailStyles.heading}>Welcome 👋</Text>
      <Text style={emailStyles.text}>
        Thanks for signing up. Add the places you visit and the services you get,
        and Beauty Scheduler will keep track of when each one is due.
      </Text>
      {optedIn ? (
        <Text style={emailStyles.muted}>
          You&apos;re opted in to email reminders — we&apos;ll nudge you before
          each one is due.
        </Text>
      ) : null}
      <Section>
        <Button href={loginUrl} style={emailStyles.button}>
          Open Beauty Scheduler
        </Button>
      </Section>
    </EmailShell>
  );
}
