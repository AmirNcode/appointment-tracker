import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mx-auto w-full max-w-md sm:max-w-lg">
        <span className="text-6xl" aria-hidden>
          💅
        </span>

        <h1 className="font-display mt-5 text-4xl font-semibold leading-tight text-accent-strong sm:text-5xl">
          Lumi
        </h1>

        <p className="mt-4 text-base text-muted sm:text-lg">
          Your beauty routine, on schedule. ✨ Save the spots you love, set how
          often you go, and get a gentle nudge before you&apos;re due — then add
          it to your calendar in one tap.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/signup" className="btn btn-primary">
            Create account
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Log in
          </Link>
        </div>

        <p className="mt-10 text-xs text-muted">
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
