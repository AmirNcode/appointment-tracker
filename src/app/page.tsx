import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mx-auto w-full max-w-md sm:max-w-lg">
        <span className="inline-block rounded-full border border-foreground/15 px-3 py-1 text-xs font-medium tracking-wide text-foreground/60">
          v1 · in development
        </span>

        <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
          Beauty Appointment Scheduler
        </h1>

        <p className="mt-4 text-base text-foreground/70 sm:text-lg">
          Save the spots you visit, set how often you go, and get a nudge before
          you&apos;re due — then add it to your calendar in one tap.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-foreground/20 px-5 py-2.5 text-sm font-medium text-foreground"
          >
            Log in
          </Link>
        </div>

        <p className="mt-10 text-xs text-foreground/40">
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="underline underline-offset-4">
            Terms
          </Link>
        </p>
      </div>
    </main>
  );
}
