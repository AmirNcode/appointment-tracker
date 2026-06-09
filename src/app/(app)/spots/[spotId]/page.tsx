import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addService,
  deleteService,
  deleteSpot,
  updateBooking,
} from "@/actions/spots";

const inputCls =
  "rounded-lg border border-foreground/15 bg-transparent px-3 py-2 outline-none focus:border-foreground/40";

function freqLabel(value: number, unit: string) {
  return `every ${value} ${unit}${value === 1 ? "" : "s"}`;
}

export default async function SpotDetailPage({
  params,
}: {
  params: Promise<{ spotId: string }>;
}) {
  const { spotId } = await params;
  const supabase = await createClient();

  const { data: spot } = await supabase
    .from("spots")
    .select(
      "id, name, formatted_address, phone, website_url, booking_url, booking_method, google_maps_uri",
    )
    .eq("id", spotId)
    .single();

  if (!spot) notFound();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, frequency_value, frequency_unit, anchor_date")
    .eq("spot_id", spotId)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10">
      <Link
        href="/spots"
        className="text-sm text-foreground/60 underline underline-offset-4"
      >
        ← Spots
      </Link>

      <h1 className="mt-3 text-2xl font-semibold">{spot.name}</h1>
      {spot.formatted_address ? (
        <p className="mt-1 text-sm text-foreground/60">{spot.formatted_address}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {spot.phone ? (
          <a href={`tel:${spot.phone}`} className="text-foreground/70 underline underline-offset-4">
            {spot.phone}
          </a>
        ) : null}
        {spot.website_url ? (
          <a href={spot.website_url} target="_blank" rel="noreferrer" className="text-foreground/70 underline underline-offset-4">
            Website
          </a>
        ) : null}
        {spot.google_maps_uri ? (
          <a href={spot.google_maps_uri} target="_blank" rel="noreferrer" className="text-foreground/70 underline underline-offset-4">
            Maps
          </a>
        ) : null}
      </div>

      {/* Services */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold">Services</h2>
        {services && services.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {services.map((svc) => (
              <li
                key={svc.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 px-3 py-2"
              >
                <span>
                  <span className="font-medium">{svc.name}</span>{" "}
                  <span className="text-sm text-foreground/60">
                    · {freqLabel(svc.frequency_value, svc.frequency_unit)}
                  </span>
                </span>
                <form action={deleteService.bind(null, svc.id, spot.id)}>
                  <button
                    type="submit"
                    className="text-sm text-foreground/50 underline underline-offset-4"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-foreground/60">No services yet.</p>
        )}

        {/* Add a service */}
        <form
          action={addService.bind(null, spot.id)}
          className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-foreground/20 p-3"
        >
          <label className="flex grow flex-col gap-1 text-xs">
            Service
            <input name="name" type="text" required placeholder="e.g. Waxing" className={inputCls} />
          </label>
          <label className="flex w-16 flex-col gap-1 text-xs">
            Every
            <input name="frequencyValue" type="number" min={1} defaultValue={5} required className={inputCls} />
          </label>
          <label className="flex w-24 flex-col gap-1 text-xs">
            Unit
            <select name="frequencyUnit" defaultValue="week" className={inputCls}>
              <option value="day">days</option>
              <option value="week">weeks</option>
              <option value="month">months</option>
            </select>
          </label>
          <label className="flex w-36 flex-col gap-1 text-xs">
            Last visit (optional)
            <input name="anchorDate" type="date" className={inputCls} />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background"
          >
            Add
          </button>
        </form>
      </section>

      {/* Booking method */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold">Booking method</h2>
        <form
          action={updateBooking.bind(null, spot.id)}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <label className="flex w-40 flex-col gap-1 text-xs">
            Method
            <select name="bookingMethod" defaultValue={spot.booking_method} className={inputCls}>
              <option value="phone">Phone</option>
              <option value="website">Website / link</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="flex grow flex-col gap-1 text-xs">
            Booking URL (for website)
            <input
              name="bookingUrl"
              type="url"
              defaultValue={spot.booking_url ?? ""}
              placeholder="https://…"
              className={inputCls}
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-foreground/20 px-3 py-2 text-sm font-medium"
          >
            Save
          </button>
        </form>
      </section>

      {/* Danger zone */}
      <section className="mt-12 border-t border-foreground/10 pt-6">
        <form action={deleteSpot.bind(null, spot.id)}>
          <button
            type="submit"
            className="text-sm font-medium text-red-600 underline underline-offset-4"
          >
            Delete this spot
          </button>
        </form>
      </section>
    </main>
  );
}
