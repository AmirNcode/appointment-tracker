import Link from "next/link";
import { AddSpot } from "@/components/spots/add-spot";

export default function NewSpotPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <Link
        href="/spots"
        className="text-sm font-medium text-muted underline underline-offset-4"
      >
        ← Spots
      </Link>
      <h1 className="font-display mt-3 text-2xl font-semibold">
        Add a spot ✨
      </h1>
      <p className="mt-1 text-sm text-muted">
        Search for a place you visit, then set what you get there and how often.
      </p>
      <AddSpot />
    </main>
  );
}
