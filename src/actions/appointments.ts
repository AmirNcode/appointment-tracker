"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  preAppointmentSendAt,
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
