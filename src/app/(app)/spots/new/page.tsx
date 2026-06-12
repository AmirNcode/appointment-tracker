import Link from "next/link";
import { AddSpot } from "@/components/spots/add-spot";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

export default async function NewSpotPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("home_city")
        .eq("id", user.id)
        .single()
    : { data: null };
  const homeCity = profile?.home_city ?? null;

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
      {homeCity ? (
        <p className="mt-2 text-xs text-muted">
          📍 Searching near <span className="font-medium">{homeCity}</span> ·{" "}
          <Link
            href="/settings"
            className="text-accent-strong underline underline-offset-4"
          >
            change
          </Link>
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">
          💡 Tip: set your{" "}
          <Link
            href="/settings"
            className="text-accent-strong underline underline-offset-4"
          >
            home city
          </Link>{" "}
          to search your area first.
        </p>
      )}
      <AddSpot />
    </main>
  );
}
