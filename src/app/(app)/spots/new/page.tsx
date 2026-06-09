import Link from "next/link";
import { AddSpot } from "@/components/spots/add-spot";
import { HomeLink } from "@/components/home-link";

export default function NewSpotPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
      <Link
        href="/spots"
        className="text-sm text-foreground/60 underline underline-offset-4"
      >
        ← Spots
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <HomeLink />
        <h1 className="text-2xl font-semibold">Add a spot</h1>
      </div>
      <p className="mt-1 text-sm text-foreground/60">
        Search for a business you visit, then set what you get there and how
        often.
      </p>
      <AddSpot />
    </main>
  );
}
