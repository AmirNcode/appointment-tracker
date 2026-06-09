import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayInTimeZone } from "@/lib/domain/scheduling";
import { HomeLink } from "@/components/home-link";

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
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {rows
          .sort((a, b) => b[1] - a[1])
          .map(([name, total]) => (
            <li
              key={name}
              className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 px-4 py-3 text-sm"
            >
              <span>{name}</span>
              <span className="font-medium">{money(total, currency)}</span>
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10">
      <Link
        href="/dashboard"
        className="text-sm text-foreground/60 underline underline-offset-4"
      >
        ← Dashboard
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <HomeLink />
        <h1 className="text-2xl font-semibold">Spend</h1>
      </div>

      {/* Month selector */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Link
          href={`/spend?month=${shiftMonth(selected, -1)}`}
          className="rounded-lg border border-foreground/20 px-3 py-1.5 text-sm"
          aria-label="Previous month"
        >
          ←
        </Link>
        <span className="text-sm font-medium">{monthLabel(selected)}</span>
        <Link
          href={`/spend?month=${shiftMonth(selected, 1)}`}
          className="rounded-lg border border-foreground/20 px-3 py-1.5 text-sm"
          aria-label="Next month"
        >
          →
        </Link>
      </div>

      {/* Monthly total */}
      <div className="mt-6 rounded-lg border border-foreground/15 p-6 text-center">
        <div className="text-xs uppercase tracking-wide text-foreground/50">
          Total this month
        </div>
        <div className="mt-1 text-3xl font-semibold">
          {money(total, currency)}
        </div>
        <div className="mt-1 text-xs text-foreground/50">
          {monthRows.length}{" "}
          {monthRows.length === 1 ? "appointment" : "appointments"}
        </div>
      </div>

      {monthRows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-foreground/60">
          No completed appointments with a cost in {monthLabel(selected)}.
        </p>
      ) : (
        <>
          <Breakdown
            title="By business"
            rows={[...bySpot.entries()]}
            currency={currency}
          />
          <Breakdown
            title="By service"
            rows={[...byService.entries()]}
            currency={currency}
          />
        </>
      )}
    </main>
  );
}
