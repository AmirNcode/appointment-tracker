import Link from "next/link";

// Home/dashboard shortcut, shown to the left of each page's <h1>.
export function HomeLink() {
  return (
    <Link
      href="/dashboard"
      aria-label="Go to dashboard"
      title="Dashboard"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-foreground/15 text-foreground/70 transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.75V21h14V9.75" />
      </svg>
    </Link>
  );
}
