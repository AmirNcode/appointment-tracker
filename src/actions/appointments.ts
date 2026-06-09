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
    .select("id, status")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt || (appt.status !== "due" && appt.status !== "booked")) return;

  const tz = await userTimezone(supabase, user.id);
  const confirmedUTC = zonedDateTimeToUTC(wallClock, tz);

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "booked",
      confirmed_datetime: confirmedUTC,
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
  const { supabase } = await requireUser();

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt || (appt.status !== "due" && appt.status !== "booked")) return;

  await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId);
  await supabase
    .from("reminders")
    .delete()
    .eq("appointment_id", appointmentId)
    .eq("sent", false);

  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath("/dashboard");
}
