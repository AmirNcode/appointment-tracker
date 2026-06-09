"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  nextDueDate,
  preAppointmentSendAt,
  reminderSendAt,
  todayInTimeZone,
  zonedDateTimeToUTC,
} from "@/lib/domain/scheduling";
import { buildAppointmentICS } from "@/lib/calendar/ics";
import { sendEmail } from "@/lib/email/send";
import { BookingConfirmationEmail } from "@/emails/booking-confirmation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function userTimezone(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();
  return data?.timezone ?? "America/Toronto";
}

/** Calendar date ("YYYY-MM-DD") of a UTC instant in the given timezone. */
function localDate(utcISO: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utcISO));
}

/** Human-readable date + time of a UTC instant in the given timezone. */
function formatDateTime(utcISO: string, tz: string): string {
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

// T5.2 — confirm a real booking: due -> booked, store the confirmed datetime
// (the wall-clock time is interpreted in the user's timezone) plus an optional
// cost, then schedule a pre-appointment reminder. "Book now" (T5.1) is a pure
// deep link with no server call. See DESIGN §3.2.
export async function confirmAppointment(
  appointmentId: string,
  formData: FormData,
): Promise<void> {
  const { supabase, user } = await requireUser();

  const wallClock = String(formData.get("confirmedAt") ?? "").trim();
  if (!wallClock) return;
  const costRaw = String(formData.get("cost") ?? "").trim();
  const cost = costRaw ? Number(costRaw) : null;
  if (cost !== null && (!Number.isFinite(cost) || cost < 0)) return;

  // Only an owner's open appointment can be confirmed (RLS also enforces this).
  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, status, ics_sequence, duration_minutes, service:services(name), spot:spots(name, formatted_address, phone, booking_url, website_url)",
    )
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt || (appt.status !== "due" && appt.status !== "booked")) return;

  const tz = await userTimezone(supabase, user.id);
  const confirmedUTC = zonedDateTimeToUTC(wallClock, tz);
  // First confirm publishes SEQUENCE 0; editing an already-booked appointment
  // bumps it so a re-issued .ics updates the existing calendar event (T7.4).
  const sequence =
    appt.status === "booked" ? appt.ics_sequence + 1 : appt.ics_sequence;

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "booked",
      confirmed_datetime: confirmedUTC,
      ics_sequence: sequence,
      ...(cost !== null ? { cost } : {}),
    })
    .eq("id", appointmentId);
  if (error) return;

  // Drop the now-moot "due soon" nudge and any stale pre-appointment reminder,
  // then schedule a fresh one. Keeps re-confirming the same appointment idempotent.
  await supabase
    .from("reminders")
    .delete()
    .eq("appointment_id", appointmentId)
    .eq("sent", false);
  await supabase.from("reminders").insert({
    user_id: user.id,
    appointment_id: appointmentId,
    type: "pre_appointment",
    channel: "email",
    send_at: preAppointmentSendAt(confirmedUTC),
  });

  // T7.3 — booking-confirmation email with the .ics attached (best-effort).
  if (user.email) {
    try {
      const base = process.env.APP_URL ?? "http://localhost:3000";
      const serviceName = appt.service?.name ?? "your appointment";
      const spotName = appt.spot?.name ?? "your spot";
      const ics = buildAppointmentICS({
        appointmentId,
        startUTC: confirmedUTC,
        durationMinutes: appt.duration_minutes,
        serviceName,
        spotName,
        location: appt.spot?.formatted_address,
        phone: appt.spot?.phone,
        bookingUrl: appt.spot?.booking_url ?? appt.spot?.website_url,
        appUrl: `${base}/appointments/${appointmentId}`,
        sequence,
      });
      await sendEmail({
        to: user.email,
        subject: `Booked: ${serviceName} at ${spotName}`,
        react: BookingConfirmationEmail({
          serviceName,
          spotName,
          whenText: formatDateTime(confirmedUTC, tz),
          viewUrl: `${base}/appointments/${appointmentId}`,
        }),
        tag: "booking_confirmation",
        attachments: [
          { filename: "appointment.ics", content: Buffer.from(ics) },
        ],
      });
    } catch {
      // ignore — confirmation email is best-effort
    }
  }

  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath("/dashboard");
}

// T5.3 — complete a visit: mark it completed (+ optional cost) and roll the
// cycle forward by seeding the next `due` appointment and its `due_soon`
// reminder. Next due = the visit date (the confirmed datetime if it was booked,
// otherwise today) + the service's frequency. See DESIGN §3.3.
export async function completeAppointment(
  appointmentId: string,
  formData: FormData,
): Promise<void> {
  const { supabase, user } = await requireUser();

  const costRaw = String(formData.get("cost") ?? "").trim();
  const cost = costRaw ? Number(costRaw) : null;
  if (cost !== null && (!Number.isFinite(cost) || cost < 0)) return;

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, status, spot_id, service_id, confirmed_datetime, service:services(frequency_value, frequency_unit)",
    )
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt || (appt.status !== "due" && appt.status !== "booked")) return;
  if (!appt.service) return;

  const tz = await userTimezone(supabase, user.id);
  const visitDate = appt.confirmed_datetime
    ? localDate(appt.confirmed_datetime, tz)
    : todayInTimeZone(tz);
  const nextDue = nextDueDate(
    visitDate,
    appt.service.frequency_value,
    appt.service.frequency_unit,
  );

  // Close the current cycle first (preserves the one-open-per-service
  // invariant), then seed the next one.
  const { error } = await supabase
    .from("appointments")
    .update({
      status: "completed",
      ...(cost !== null ? { cost } : {}),
    })
    .eq("id", appointmentId);
  if (error) return;

  // The completed appointment's pending reminders are moot now.
  await supabase
    .from("reminders")
    .delete()
    .eq("appointment_id", appointmentId)
    .eq("sent", false);

  const { data: next } = await supabase
    .from("appointments")
    .insert({
      user_id: user.id,
      spot_id: appt.spot_id,
      service_id: appt.service_id,
      status: "due",
      due_date: nextDue,
    })
    .select("id")
    .single();
  if (next) {
    await supabase.from("reminders").insert({
      user_id: user.id,
      appointment_id: next.id,
      type: "due_soon",
      channel: "email",
      send_at: reminderSendAt(nextDue),
    });
  }

  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath("/dashboard");
}

// T5.4 — cancel an appointment: a terminal state that removes its pending
// reminders. It does NOT roll the cycle forward (per the DESIGN §4.6 state
// machine); the service has no open appointment afterwards.
export async function cancelAppointment(appointmentId: string): Promise<void> {
  const { supabase, user } = await requireUser();

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, status, confirmed_datetime, ics_sequence, duration_minutes, service:services(name), spot:spots(name, formatted_address)",
    )
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt || (appt.status !== "due" && appt.status !== "booked")) return;

  const sequence = appt.ics_sequence + 1;
  await supabase
    .from("appointments")
    .update({ status: "cancelled", ics_sequence: sequence })
    .eq("id", appointmentId);
  await supabase
    .from("reminders")
    .delete()
    .eq("appointment_id", appointmentId)
    .eq("sent", false);

  // T7.4 — if it was a real booking, email a CANCEL .ics so the user's calendar
  // can drop the event (best-effort).
  if (appt.confirmed_datetime && user.email) {
    try {
      const tz = await userTimezone(supabase, user.id);
      const base = process.env.APP_URL ?? "http://localhost:3000";
      const serviceName = appt.service?.name ?? "your appointment";
      const spotName = appt.spot?.name ?? "your spot";
      const ics = buildAppointmentICS({
        appointmentId,
        startUTC: appt.confirmed_datetime,
        durationMinutes: appt.duration_minutes,
        serviceName,
        spotName,
        location: appt.spot?.formatted_address,
        appUrl: `${base}/appointments/${appointmentId}`,
        sequence,
        cancelled: true,
      });
      await sendEmail({
        to: user.email,
        subject: `Cancelled: ${serviceName} at ${spotName}`,
        react: BookingConfirmationEmail({
          serviceName,
          spotName,
          whenText: formatDateTime(appt.confirmed_datetime, tz),
          viewUrl: `${base}/appointments/${appointmentId}`,
          cancelled: true,
        }),
        tag: "booking_cancellation",
        attachments: [
          { filename: "appointment.ics", content: Buffer.from(ics) },
        ],
      });
    } catch {
      // ignore — cancellation email is best-effort
    }
  }

  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath("/dashboard");
}

// T8.1 — edit the recorded amount after the fact (e.g. correct a typo on a
// completed appointment). Empty clears it. RLS scopes the update to the owner.
export async function updateAppointmentCost(
  appointmentId: string,
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireUser();
  const costRaw = String(formData.get("cost") ?? "").trim();
  const cost = costRaw === "" ? null : Number(costRaw);
  if (cost !== null && (!Number.isFinite(cost) || cost < 0)) return;

  await supabase
    .from("appointments")
    .update({ cost })
    .eq("id", appointmentId);

  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath("/spend");
  revalidatePath("/dashboard");
}
