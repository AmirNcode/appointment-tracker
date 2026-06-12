import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { confirmAppointment, updateAppointmentCost } from "@/actions/appointments";
import { AppointmentActions } from "@/components/appointments/appointment-actions";

// A UTC instant -> "YYYY-MM-DDTHH:mm" wall clock in `tz`, for a datetime-local input.
function toLocalInputValue(utcISO: string, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcISO));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function formatConfirmed(utcISO: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(utcISO));
}

export default async function AppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  const tz = profile?.timezone ?? "America/Toronto";

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, status, due_date, confirmed_datetime, cost, currency, spot_id, service:services(name), spot:spots(name, formatted_address, phone, website_url, booking_url, booking_method, google_maps_uri)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!appt) notFound();

  const spot = appt.spot;
  const booked = appt.status === "booked";
  const open = appt.status === "due" || appt.status === "booked";
  const bookingUrl = spot?.booking_url || spot?.website_url || null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-muted underline underline-offset-4"
      >
        ← Home
      </Link>

      <h1 className="font-display mt-3 text-2xl font-semibold">
        {appt.service?.name}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {spot?.name}
        {appt.spot_id ? (
          <>
            {" · "}
            <Link
              href={`/spots/${appt.spot_id}`}
              className="text-accent-strong underline underline-offset-4"
            >
              Edit spot
            </Link>
          </>
        ) : null}
      </p>

      {/* Current status */}
      <div className="card mt-4 px-4 py-3.5 text-sm font-medium">
        {appt.status === "completed" ? (
          <span className="flex items-center gap-2">
            <span className="chip chip-accent">✅ Completed</span>
            {appt.cost != null
              ? `${appt.currency} ${Number(appt.cost).toFixed(2)}`
              : ""}
          </span>
        ) : appt.status === "cancelled" ? (
          <span className="chip chip-muted">Cancelled</span>
        ) : booked && appt.confirmed_datetime ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="chip chip-accent">📅 Booked</span>
            {formatConfirmed(appt.confirmed_datetime, tz)}
            {appt.cost != null
              ? ` · ${appt.currency} ${Number(appt.cost).toFixed(2)}`
              : ""}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="chip chip-muted">Due</span> {appt.due_date}
          </span>
        )}
      </div>

      {booked ? (
        <div className="mt-3">
          <a
            href={`/api/appointments/${appt.id}/ics`}
            className="btn btn-secondary btn-sm"
          >
            📆 Add to calendar
          </a>
        </div>
      ) : null}

      {open ? (
        <>
          {/* Book now: deep link by booking method (no server call) */}
          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Book now
            </h2>
            <div className="mt-3 text-sm">
              {spot?.booking_method === "phone" ? (
                spot.phone ? (
                  <a href={`tel:${spot.phone}`} className="btn btn-primary">
                    📞 Call {spot.phone}
                  </a>
                ) : (
                  <p className="text-muted">
                    No phone number saved for this spot.
                  </p>
                )
              ) : spot?.booking_method === "website" ? (
                bookingUrl ? (
                  <a
                    href={bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                  >
                    🌐 Open booking site
                  </a>
                ) : (
                  <p className="text-muted">
                    No booking link saved for this spot.
                  </p>
                )
              ) : (
                <div className="flex flex-col gap-1 text-muted">
                  {spot?.phone ? (
                    <a
                      href={`tel:${spot.phone}`}
                      className="text-accent-strong underline underline-offset-4"
                    >
                      📞 {spot.phone}
                    </a>
                  ) : null}
                  {spot?.formatted_address ? (
                    <span>{spot.formatted_address}</span>
                  ) : null}
                  {spot?.google_maps_uri ? (
                    <a
                      href={spot.google_maps_uri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-strong underline underline-offset-4"
                    >
                      🗺️ Open in Maps
                    </a>
                  ) : null}
                  {!spot?.phone &&
                  !spot?.formatted_address &&
                  !spot?.google_maps_uri ? (
                    <span className="text-muted">No booking details saved.</span>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          {/* Confirm the booking */}
          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {booked ? "Update booking" : "Confirm your booking"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Booked it? Enter the date &amp; time so we can remind you and add
              it to your calendar. 💖
            </p>
            <form
              action={confirmAppointment.bind(null, appt.id)}
              className="card mt-3 flex flex-wrap items-end gap-3 p-4"
            >
              <label className="field-label grow">
                Date &amp; time
                <input
                  name="confirmedAt"
                  type="datetime-local"
                  required
                  defaultValue={
                    booked && appt.confirmed_datetime
                      ? toLocalInputValue(appt.confirmed_datetime, tz)
                      : undefined
                  }
                  className="input"
                />
              </label>
              <label className="field-label w-32">
                Cost (optional)
                <input
                  name="cost"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={appt.cost != null ? Number(appt.cost) : undefined}
                  placeholder="0.00"
                  className="input"
                />
              </label>
              <button type="submit" className="btn btn-primary">
                {booked ? "Update" : "Confirm booking"}
              </button>
            </form>
          </section>

          {/* complete (roll forward) / cancel */}
          <section className="mt-8 border-t border-border pt-6">
            <AppointmentActions
              id={appt.id}
              defaultCost={appt.cost != null ? Number(appt.cost) : null}
            />
          </section>
        </>
      ) : null}

      {appt.status === "completed" ? (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Cost
          </h2>
          <p className="mt-1 text-sm text-muted">
            Correct the amount if needed — it feeds your spend totals.
          </p>
          <form
            action={updateAppointmentCost.bind(null, appt.id)}
            className="card mt-3 flex items-end gap-3 p-4"
          >
            <label className="field-label w-36">
              Amount
              <input
                name="cost"
                type="number"
                min={0}
                step="0.01"
                defaultValue={appt.cost != null ? Number(appt.cost) : undefined}
                placeholder="0.00"
                className="input"
              />
            </label>
            <button type="submit" className="btn btn-secondary btn-sm">
              Save
            </button>
          </form>
        </section>
      ) : null}
    </main>
  );
}
