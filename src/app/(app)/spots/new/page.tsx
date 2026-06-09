import Link from "next/link";
import { AddSpot } from "@/components/spots/add-spot";

export default function NewSpotPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
      <Link
        href="/spots"
        className="text-sm text-foreground/60 underline underline-offset-4"
      >
        ← Spots
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Add a spot</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Search for a business you visit, then set what you get there and how
        often.
      </p>
      <AddSpot />
    </main>
  );
}
