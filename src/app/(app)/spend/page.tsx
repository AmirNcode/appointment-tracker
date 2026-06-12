import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { todayInTimeZone } from "@/lib/domain/scheduling";

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthInTz(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  return `${y}-${m}`;
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(
    amount,
  );
}

function Breakdown({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: [string, number][];
  currency: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {rows
          .sort((a, b) => b[1] - a[1])
          .map(([name, total]) => (
            <li
              key={name}
              className="card flex items-center justify-between gap-3 px-4 py-3.5 text-sm"
            >
              <span>{name}</span>
              <span className="font-semibold">{money(total, currency)}</span>
            </li>
          ))}
      </ul>
    </section>
  );
}

export default async function SpendPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null; // (app)/layout guards this

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const tz = profile?.timezone ?? "America/Toronto";
  const currentMonth = todayInTimeZone(tz).slice(0, 7);
  const selected = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : currentMonth;

  // Spend = completed appointments with a recorded cost, bucketed by the visit
  // date (confirmed datetime, else when it was marked completed) in the user tz.
  const { data: rows } = await supabase
    .from("appointments")
    .select(
      "id, cost, currency, confirmed_datetime, updated_at, service:services(name), spot:spots(name)",
    )
    .eq("status", "completed")
    .not("cost", "is", null);

  const monthRows = (rows ?? []).filter(
    (r) =>
      monthInTz(new Date(r.confirmed_datetime ?? r.updated_at), tz) === selected,
  );

  const currency = monthRows[0]?.currency ?? "CAD";
  const total = monthRows.reduce((sum, r) => sum + Number(r.cost), 0);

  const bySpot = new Map<string, number>();
  const byService = new Map<string, number>();
  for (const r of monthRows) {
    const spotName = r.spot?.name ?? "Unknown";
    const svcName = r.service?.name ?? "Unknown";
    bySpot.set(spotName, (bySpot.get(spotName) ?? 0) + Number(r.cost));
    byService.set(svcName, (byService.get(svcName) ?? 0) + Number(r.cost));
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <h1 className="font-display text-2xl font-semibold">Spend 💸</h1>

      {/* Month selector */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Link
          href={`/spend?month=${shiftMonth(selected, -1)}`}
          className="btn btn-secondary btn-sm"
          aria-label="Previous month"
        >
          ←
        </Link>
        <span className="text-sm font-semibold">{monthLabel(selected)}</span>
        <Link
          href={`/spend?month=${shiftMonth(selected, 1)}`}
          className="btn btn-secondary btn-sm"
          aria-label="Next month"
        >
          →
        </Link>
      </div>

      {/* Monthly total */}
      <div className="mt-6 rounded-3xl bg-gradient-to-br from-accent to-accent-strong px-6 py-8 text-center text-white shadow-[0_20px_40px_-20px_rgba(124,58,237,0.7)]">
        <div className="text-xs uppercase tracking-wide text-white/70">
          Total this month
        </div>
        <div className="font-display mt-1 text-4xl font-semibold">
          {money(total, currency)}
        </div>
        <div className="mt-1 text-xs text-white/70">
          {monthRows.length}{" "}
          {monthRows.length === 1 ? "appointment" : "appointments"}
        </div>
      </div>

      {monthRows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">
          No completed appointments with a cost in {monthLabel(selected)}. 🌷
        </p>
      ) : (
        <>
          <Breakdown
            title="By place 📍"
            rows={[...bySpot.entries()]}
            currency={currency}
          />
          <Breakdown
            title="By service 💅"
            rows={[...byService.entries()]}
            currency={currency}
          />
        </>
      )}
    </main>
  );
}
