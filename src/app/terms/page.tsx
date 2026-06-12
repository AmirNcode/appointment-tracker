import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

const CONTACT_EMAIL = "support@jivanmag.com";
const UPDATED = "June 10, 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link
        href="/"
        className="text-sm text-muted underline underline-offset-4"
      >
        ← Home
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Terms of Service</h1>
      <p className="mt-1 text-sm text-muted">Last updated: {UPDATED}</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-6 text-foreground/80">
        <section>
          <h2 className="text-base font-semibold text-foreground">
            Using Lumi
          </h2>
          <p className="mt-2">
            Lumi helps you track recurring personal appointments and
            reminds you when they&rsquo;re due. It&rsquo;s intended for personal,
            non-commercial use. You&rsquo;re responsible for keeping your account
            credentials secure and for the accuracy of the information you enter.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Reminders &amp; calendar files
          </h2>
          <p className="mt-2">
            Reminders and calendar (.ics) exports are provided as a convenience.
            We don&rsquo;t book appointments on your behalf, and we can&rsquo;t
            guarantee that a reminder will be delivered or that a calendar file
            will sync perfectly with every calendar app. Always confirm important
            appointments directly with the business.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Availability &amp; changes
          </h2>
          <p className="mt-2">
            The service is provided &ldquo;as is,&rdquo; without warranties of
            any kind. We may change, suspend, or discontinue features at any
            time. To the maximum extent permitted by law, we are not liable for
            any indirect or consequential damages arising from your use of the
            service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Your account
          </h2>
          <p className="mt-2">
            You may delete your account at any time from your settings, which
            permanently removes your data. We may suspend or terminate accounts
            that misuse the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p className="mt-2">
            Questions about these terms? Email{" "}
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
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
      </p>
    </main>
  );
}
