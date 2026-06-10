import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth";
import { todayInTimeZone } from "@/lib/domain/scheduling";
import { HomeLink } from "@/components/home-link";

function freqLabel(value: number, unit: string) {
  return `every ${value} ${unit}${value === 1 ? "" : "s"}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // (app)/layout already guards this

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const today = todayInTimeZone(profile?.timezone ?? "America/Toronto");

  const { data: items } = await supabase
    .from("appointments")
    .select(
      "id, due_date, status, spot_id, service:services(name, frequency_value, frequency_unit), spot:spots(name)",
    )
    .in("status", ["due", "booked"])
    .order("due_date", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <HomeLink />
          <h1 className="text-2xl font-semibold">Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          <Link
            href="/spots"
            className="text-sm font-medium underline underline-offset-4"
          >
            Your spots
          </Link>
          <Link
            href="/spend"
            className="text-sm font-medium underline underline-offset-4"
          >
            Spend
          </Link>
          <Link
            href="/settings"
            className="text-sm font-medium underline underline-offset-4"
          >
            Settings
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-foreground/20 px-3 py-1.5 text-sm font-medium text-foreground"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <p className="mt-4 text-sm text-foreground/70">
        Signed in as <span className="font-medium">{user.email}</span>.
      </p>

      <h2 className="mt-8 text-sm font-semibold">Upcoming &amp; overdue</h2>
      {!items || items.length === 0 ? (
        <p className="mt-3 text-sm text-foreground/60">
          Nothing due yet.{" "}
          <Link href="/spots/new" className="underline underline-offset-4">
            Add a spot
          </Link>{" "}
          to get started.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((it) => {
            const overdue = it.due_date < today;
            return (
              <li key={it.id}>
                <Link
                  href={`/appointments/${it.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 px-4 py-3 hover:border-foreground/30"
                >
                  <div>
                    <div className="font-medium">
                      {it.service?.name}{" "}
                      <span className="text-foreground/40">·</span>{" "}
                      <span className="text-sm font-normal text-foreground/60">
                        {it.spot?.name}
                      </span>
                    </div>
                    {it.service ? (
                      <div className="mt-0.5 text-xs text-foreground/50">
                        {freqLabel(
                          it.service.frequency_value,
                          it.service.frequency_unit,
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-medium ${
                        overdue ? "text-red-600" : "text-foreground/80"
                      }`}
                    >
                      {overdue ? "Overdue" : "Due"} {it.due_date}
                    </div>
                    {it.status === "booked" ? (
                      <div className="text-xs text-foreground/50">booked</div>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
