import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addService, deleteSpot, updateBooking } from "@/actions/spots";
import { ServiceItem } from "@/components/spots/service-item";

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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <Link
        href="/spots"
        className="text-sm font-medium text-muted underline underline-offset-4"
      >
        ← Spots
      </Link>

      <h1 className="font-display mt-3 text-2xl font-semibold">{spot.name}</h1>
      {spot.formatted_address ? (
        <p className="mt-1 text-sm text-muted">{spot.formatted_address}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {spot.phone ? (
          <a href={`tel:${spot.phone}`} className="chip chip-accent">
            📞 {spot.phone}
          </a>
        ) : null}
        {spot.website_url ? (
          <a
            href={spot.website_url}
            target="_blank"
            rel="noreferrer"
            className="chip chip-accent"
          >
            🌐 Website
          </a>
        ) : null}
        {spot.google_maps_uri ? (
          <a
            href={spot.google_maps_uri}
            target="_blank"
            rel="noreferrer"
            className="chip chip-accent"
          >
            🗺️ Maps
          </a>
        ) : null}
      </div>

      {/* Services */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Services 💅
        </h2>
        {services && services.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2.5">
            {services.map((svc) => (
              <ServiceItem key={svc.id} service={svc} spotId={spot.id} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No services yet.</p>
        )}

        {/* Add a service */}
        <form
          action={addService.bind(null, spot.id)}
          className="card mt-3 flex flex-wrap items-end gap-3 p-4"
        >
          <label className="field-label grow">
            Service
            <input
              name="name"
              type="text"
              required
              placeholder="e.g. Waxing"
              className="input"
            />
          </label>
          <label className="field-label w-20">
            Every
            <input
              name="frequencyValue"
              type="number"
              min={1}
              defaultValue={5}
              required
              className="input"
            />
          </label>
          <label className="field-label w-28">
            Unit
            <select name="frequencyUnit" defaultValue="week" className="input">
              <option value="day">days</option>
              <option value="week">weeks</option>
              <option value="month">months</option>
            </select>
          </label>
          <label className="field-label w-40">
            Last visit (optional)
            <input name="anchorDate" type="date" className="input" />
          </label>
          <button type="submit" className="btn btn-primary btn-sm">
            Add
          </button>
        </form>
      </section>

      {/* Booking method */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          How you book
        </h2>
        <form
          action={updateBooking.bind(null, spot.id)}
          className="card mt-3 flex flex-wrap items-end gap-3 p-4"
        >
          <label className="field-label w-44">
            Method
            <select
              name="bookingMethod"
              defaultValue={spot.booking_method}
              className="input"
            >
              <option value="phone">Phone</option>
              <option value="website">Website / link</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="field-label grow">
            Booking URL (for website)
            <input
              name="bookingUrl"
              type="url"
              defaultValue={spot.booking_url ?? ""}
              placeholder="https://…"
              className="input"
            />
          </label>
          <button type="submit" className="btn btn-secondary btn-sm">
            Save
          </button>
        </form>
      </section>

      {/* Danger zone */}
      <section className="mt-12 border-t border-border pt-6">
        <form action={deleteSpot.bind(null, spot.id)}>
          <button
            type="submit"
            className="text-sm font-medium text-danger underline underline-offset-4"
          >
            Delete this spot
          </button>
        </form>
      </section>
    </main>
  );
}
