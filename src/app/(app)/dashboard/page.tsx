import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { todayInTimeZone } from "@/lib/domain/scheduling";
import { Brand } from "@/components/brand";

function freqLabel(value: number, unit: string) {
  return `every ${value} ${unit}${value === 1 ? "" : "s"}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
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

  const overdueCount = (items ?? []).filter(
    (it) => it.status !== "booked" && it.due_date < today,
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-4">
        <Brand />
        <Link href="/spots/new" className="btn btn-primary btn-sm">
          ＋ Add spot
        </Link>
      </header>

      <h1 className="font-display mt-6 text-3xl font-semibold leading-tight">
        Hi, lovely ✨
      </h1>
      <p className="mt-1 text-sm text-muted">
        {overdueCount > 0
          ? `You have ${overdueCount} thing${overdueCount === 1 ? "" : "s"} overdue — let's get you booked. 💖`
          : "Here's what's coming up for you."}
      </p>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-muted">
        Upcoming &amp; overdue
      </h2>

      {!items || items.length === 0 ? (
        <div className="card mt-3 flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="text-4xl">🌸</span>
          <p className="text-sm text-muted">
            Nothing due yet. Add a spot you visit and we&apos;ll keep track of
            when you&apos;re due.
          </p>
          <Link href="/spots/new" className="btn btn-primary btn-sm">
            ＋ Add your first spot
          </Link>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {items.map((it) => {
            const overdue = it.status !== "booked" && it.due_date < today;
            return (
              <li key={it.id}>
                <Link
                  href={`/appointments/${it.id}`}
                  className="card flex items-center justify-between gap-3 px-4 py-3.5 transition-transform active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {it.service?.name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted">
                      {it.spot?.name}
                      {it.service
                        ? ` · ${freqLabel(it.service.frequency_value, it.service.frequency_unit)}`
                        : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {it.status === "booked" ? (
                      <span className="chip chip-accent">📅 Booked</span>
                    ) : overdue ? (
                      <span className="chip chip-danger">⏰ Overdue</span>
                    ) : (
                      <span className="chip chip-muted">Due</span>
                    )}
                    <span className="text-xs text-muted">{it.due_date}</span>
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
