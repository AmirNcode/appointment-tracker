import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAppointmentICS } from "@/lib/calendar/ics";

export const dynamic = "force-dynamic";

// T7.2 — download a confirmed appointment as an .ics file. Auth + RLS via the
// user's session, so a user can only export their own appointment.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, status, confirmed_datetime, duration_minutes, ics_sequence, service:services(name), spot:spots(name, formatted_address, phone, booking_url, website_url)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!appt || !appt.confirmed_datetime) {
    return new Response("No calendar event for this appointment.", {
      status: 404,
    });
  }

  const base = process.env.APP_URL ?? "http://localhost:3000";
  const ics = buildAppointmentICS({
    appointmentId: appt.id,
    startUTC: appt.confirmed_datetime,
    durationMinutes: appt.duration_minutes,
    serviceName: appt.service?.name ?? "Appointment",
    spotName: appt.spot?.name ?? "",
    location: appt.spot?.formatted_address,
    phone: appt.spot?.phone,
    bookingUrl: appt.spot?.booking_url ?? appt.spot?.website_url,
    appUrl: `${base}/appointments/${appt.id}`,
    sequence: appt.ics_sequence,
    cancelled: appt.status === "cancelled",
  });

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="appointment-${appt.id}.ics"`,
    },
  });
}
