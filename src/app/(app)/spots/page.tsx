import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SpotsPage() {
  const supabase = await createClient();
  const { data: spots } = await supabase
    .from("spots")
    .select("id, name, formatted_address, booking_method")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Your spots 📍</h1>
        <Link href="/spots/new" className="btn btn-primary btn-sm">
          ＋ Add spot
        </Link>
      </header>

      {!spots || spots.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="text-4xl">💆‍♀️</span>
          <p className="text-sm text-muted">
            No spots yet. Add the salons, studios and clinics you visit
            regularly.
          </p>
          <Link href="/spots/new" className="btn btn-primary btn-sm">
            ＋ Add a spot
          </Link>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {spots.map((s) => (
            <li key={s.id}>
              <Link
                href={`/spots/${s.id}`}
                className="card flex items-center gap-3 px-4 py-4 transition-transform active:scale-[0.99]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg">
                  ✨
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.name}</div>
                  {s.formatted_address ? (
                    <div className="mt-0.5 truncate text-sm text-muted">
                      {s.formatted_address}
                    </div>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
