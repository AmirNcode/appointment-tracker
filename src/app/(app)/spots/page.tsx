import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SpotsPage() {
  const supabase = await createClient();
  const { data: spots } = await supabase
    .from("spots")
    .select("id, name, formatted_address, booking_method")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Your spots</h1>
        <Link
          href="/spots/new"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Add spot
        </Link>
      </header>

      {!spots || spots.length === 0 ? (
        <p className="mt-12 text-center text-sm text-foreground/60">
          No spots yet. Add the businesses you visit regularly.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {spots.map((s) => (
            <li key={s.id}>
              <Link
                href={`/spots/${s.id}`}
                className="block rounded-lg border border-foreground/15 p-4 hover:border-foreground/30"
              >
                <div className="font-medium">{s.name}</div>
                {s.formatted_address ? (
                  <div className="mt-0.5 text-sm text-foreground/60">
                    {s.formatted_address}
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
