import Link from "next/link";

// Lumi wordmark: 💅 + the name in the display serif.
export function Brand({
  href = "/dashboard",
  size = "md",
}: {
  href?: string;
  size?: "md" | "lg";
}) {
  const text = size === "lg" ? "text-3xl" : "text-xl";
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5"
      aria-label="Lumi — home"
    >
      <span aria-hidden className={size === "lg" ? "text-3xl" : "text-xl"}>
        💅
      </span>
      <span
        className={`font-display ${text} font-semibold text-accent-strong`}
      >
        Lumi
      </span>
    </Link>
  );
}
