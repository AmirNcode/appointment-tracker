import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { confirmAppointment } from "@/actions/appointments";
import { HomeLink } from "@/components/home-link";
import { AppointmentActions } from "@/components/appointments/appointment-actions";

const inputCls =
  "rounded-lg border border-foreground/15 bg-transparent px-3 py-2 outline-none focus:border-foreground/40";

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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10">
      <Link
        href="/dashboard"
        className="text-sm text-foreground/60 underline underline-offset-4"
      >
        ← Dashboard
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <HomeLink />
        <h1 className="text-2xl font-semibold">{appt.service?.name}</h1>
      </div>
      <p className="mt-1 text-sm text-foreground/60">
        {spot?.name}
        {appt.spot_id ? (
          <>
            {" · "}
            <Link
              href={`/spots/${appt.spot_id}`}
              className="underline underline-offset-4"
            >
              Edit spot
            </Link>
          </>
        ) : null}
      </p>

      {/* Current status */}
      <div className="mt-4 text-sm font-medium text-foreground/80">
        {appt.status === "completed" ? (
          <>
            Completed
            {appt.cost != null
              ? ` · ${appt.currency} ${Number(appt.cost).toFixed(2)}`
              : ""}
          </>
        ) : appt.status === "cancelled" ? (
          <span className="text-foreground/50">Cancelled</span>
        ) : booked && appt.confirmed_datetime ? (
          <>
            Booked for {formatConfirmed(appt.confirmed_datetime, tz)}
            {appt.cost != null
              ? ` · ${appt.currency} ${Number(appt.cost).toFixed(2)}`
              : ""}
          </>
        ) : (
          <>Due {appt.due_date}</>
        )}
      </div>

      {booked ? (
        <div className="mt-3">
          <a
            href={`/api/appointments/${appt.id}/ics`}
            className="inline-block rounded-lg border border-foreground/20 px-3 py-1.5 text-sm font-medium"
          >
            Add to calendar
          </a>
        </div>
      ) : null}

      {open ? (
        <>
          {/* T5.1 — Book now: deep link by booking method (no server call) */}
          <section className="mt-8">
            <h2 className="text-sm font-semibold">Book now</h2>
            <div className="mt-3 text-sm">
              {spot?.booking_method === "phone" ? (
                spot.phone ? (
                  <a
                    href={`tel:${spot.phone}`}
                    className="inline-block rounded-lg bg-foreground px-4 py-2 font-medium text-background"
                  >
                    Call {spot.phone}
                  </a>
                ) : (
                  <p className="text-foreground/60">
                    No phone number saved for this spot.
                  </p>
                )
              ) : spot?.booking_method === "website" ? (
                bookingUrl ? (
                  <a
                    href={bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-lg bg-foreground px-4 py-2 font-medium text-background"
                  >
                    Open booking site
                  </a>
                ) : (
                  <p className="text-foreground/60">
                    No booking link saved for this spot.
                  </p>
                )
              ) : (
                <div className="flex flex-col gap-1 text-foreground/70">
                  {spot?.phone ? (
                    <a
                      href={`tel:${spot.phone}`}
                      className="underline underline-offset-4"
                    >
                      {spot.phone}
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
                      className="underline underline-offset-4"
                    >
                      Open in Maps
                    </a>
                  ) : null}
                  {!spot?.phone &&
                  !spot?.formatted_address &&
                  !spot?.google_maps_uri ? (
                    <span className="text-foreground/60">
                      No booking details saved.
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          {/* T5.2 — Confirm the booking */}
          <section className="mt-8">
            <h2 className="text-sm font-semibold">
              {booked ? "Update booking" : "Confirm your booking"}
            </h2>
            <p className="mt-1 text-sm text-foreground/60">
              Booked it? Enter the date &amp; time so we can remind you (and,
              later, add it to your calendar).
            </p>
            <form
              action={confirmAppointment.bind(null, appt.id)}
              className="mt-3 flex flex-wrap items-end gap-2"
            >
              <label className="flex flex-col gap-1 text-xs">
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
                  className={inputCls}
                />
              </label>
              <label className="flex w-28 flex-col gap-1 text-xs">
                Cost (optional)
                <input
                  name="cost"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={appt.cost != null ? Number(appt.cost) : undefined}
                  placeholder="0.00"
                  className={inputCls}
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
              >
                {booked ? "Update" : "Confirm booking"}
              </button>
            </form>
          </section>

          {/* T5.3 + T5.4 — complete (roll forward) / cancel */}
          <section className="mt-8 border-t border-foreground/10 pt-6">
            <AppointmentActions
              id={appt.id}
              defaultCost={appt.cost != null ? Number(appt.cost) : null}
            />
          </section>
        </>
      ) : null}
    </main>
  );
}
