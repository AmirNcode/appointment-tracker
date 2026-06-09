import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { signUnsubToken } from "@/lib/email/unsubscribe";
import { DueSoonEmail } from "@/emails/due-soon";
import { PreAppointmentEmail } from "@/emails/pre-appointment";

export const dynamic = "force-dynamic";

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

function formatWhen(utcISO: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(utcISO));
}

// T6.4 — daily reminder sweep. Vercel Cron calls this with
// `Authorization: Bearer <CRON_SECRET>` (set automatically when CRON_SECRET is
// an env var). Uses the service-role admin client to read across all users.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const nowISO = new Date().toISOString();

  const { data: due, error } = await admin
    .from("reminders")
    .select(
      "id, type, send_at, user_id, appointment:appointments(id, status, due_date, confirmed_datetime, service:services(name), spot:spots(name)), profile:profiles(email, email_reminders_opt_in, timezone)",
    )
    .eq("sent", false)
    .lte("send_at", nowISO)
    .order("send_at", { ascending: true })
    .limit(100);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of due ?? []) {
    const appt = r.appointment;
    const profile = r.profile;
    const recipient = profile?.email;
    const tz = profile?.timezone ?? "America/Toronto";

    // Resolve reminders that shouldn't send (gone/terminal appointment, status
    // no longer matches the reminder type, not opted in, or no email) by marking
    // them sent so the daily query stays small.
    if (
      !appt ||
      !recipient ||
      !profile?.email_reminders_opt_in ||
      appt.status === "completed" ||
      appt.status === "cancelled" ||
      (r.type === "due_soon" && appt.status !== "due") ||
      (r.type === "pre_appointment" && appt.status !== "booked")
    ) {
      await admin
        .from("reminders")
        .update({ sent: true, sent_at: nowISO })
        .eq("id", r.id);
      skipped++;
      continue;
    }

    const base = appUrl();
    const bookUrl = `${base}/appointments/${appt.id}`;
    const unsubscribeUrl = `${base}/api/unsubscribe?token=${signUnsubToken(r.user_id)}`;
    const serviceName = appt.service?.name ?? "your appointment";
    const spotName = appt.spot?.name ?? "your spot";

    const react =
      r.type === "due_soon"
        ? DueSoonEmail({
            serviceName,
            spotName,
            dueDate: appt.due_date,
            bookUrl,
            unsubscribeUrl,
          })
        : PreAppointmentEmail({
            serviceName,
            spotName,
            whenText: appt.confirmed_datetime
              ? formatWhen(appt.confirmed_datetime, tz)
              : appt.due_date,
            bookUrl,
            unsubscribeUrl,
          });

    const subject =
      r.type === "due_soon"
        ? `${serviceName} at ${spotName} is due soon`
        : `Upcoming: ${serviceName} at ${spotName}`;

    const result = await sendEmail({
      to: recipient,
      subject,
      react,
      unsubscribeUrl,
      tag: r.type,
    });

    if (result.error) {
      await admin
        .from("reminders")
        .update({ last_error: result.error.slice(0, 500) })
        .eq("id", r.id);
      failed++;
    } else {
      await admin
        .from("reminders")
        .update({ sent: true, sent_at: nowISO })
        .eq("id", r.id);
      sent++;
    }
  }

  return Response.json({ ok: true, processed: (due ?? []).length, sent, skipped, failed });
}
