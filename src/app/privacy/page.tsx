import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Beauty Scheduler",
};

const CONTACT_EMAIL = "support@jivanmag.com";
const UPDATED = "June 10, 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link
        href="/"
        className="text-sm text-foreground/60 underline underline-offset-4"
      >
        ← Home
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-1 text-sm text-foreground/50">Last updated: {UPDATED}</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-6 text-foreground/80">
        <section>
          <h2 className="text-base font-semibold text-foreground">
            What we collect
          </h2>
          <p className="mt-2">
            When you create an account we store your email address. As you use
            Beauty Scheduler, we store the data you enter: the businesses
            (&ldquo;spots&rdquo;) you save, the services and frequencies you set,
            your appointments and any costs you record, your timezone, and your
            reminder preferences.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            How we use it
          </h2>
          <p className="mt-2">
            We use your data only to provide the service: showing your
            appointments, calculating when they&rsquo;re due, sending the email
            reminders you opt into, and generating calendar (.ics) files. We do
            not sell your data or use it for advertising.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Service providers
          </h2>
          <p className="mt-2">We rely on a few processors to run the app:</p>
          <ul className="mt-2 list-disc pl-5">
            <li>
              <strong>Supabase</strong> — stores your account and app data and
              handles authentication.
            </li>
            <li>
              <strong>Resend</strong> — delivers reminder and account emails.
            </li>
            <li>
              <strong>Google Places</strong> — powers business search; your
              search text is sent to Google to return suggestions.
            </li>
            <li>
              <strong>Vercel</strong> — hosts the application.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Email</h2>
          <p className="mt-2">
            Reminder emails are sent only if you opt in. Every reminder includes
            an unsubscribe link, and you can turn reminders off at any time from
            your settings. Account emails (such as sign-up confirmation) are sent
            as part of providing the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Keeping and deleting your data
          </h2>
          <p className="mt-2">
            We keep your data while your account is active. You can delete your
            account at any time from your settings — this permanently removes
            your profile and all associated spots, services, appointments, and
            reminders.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p className="mt-2">
            Questions about your privacy? Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="underline underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm">
        <Link href="/terms" className="underline underline-offset-4">
          Terms of Service
        </Link>
      </p>
    </main>
  );
}
