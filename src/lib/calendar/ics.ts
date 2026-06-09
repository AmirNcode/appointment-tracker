// T7.1 — pure RFC 5545 .ics generation (no external service). Produces a single
// VEVENT inside a VCALENDAR, with CRLF line endings and 75-octet line folding.

export type ICSEvent = {
  uid: string; // stable per appointment so re-issues update the same event
  startUTC: string | Date; // the confirmed instant
  durationMinutes: number;
  summary: string;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  sequence?: number; // bumped on each edit (ics_sequence)
  cancelled?: boolean; // STATUS:CANCELLED + METHOD:CANCEL
  /** Minutes before start for an in-event VALARM. Default 1440 (1 day); null disables. */
  alarmMinutesBefore?: number | null;
  dtstamp?: Date; // injectable for deterministic tests
  prodId?: string;
};

const PROD_ID = "-//Beauty Scheduler//EN";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** A Date → iCalendar UTC stamp, e.g. 20260715T183000Z. */
function toICSDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Escape a TEXT value per RFC 5545 §3.3.11. */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Fold a content line to ≤75 octets with CRLF + single-space continuations. */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [line.slice(0, 74)];
  let i = 74;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + 73));
    i += 73;
  }
  return parts.join("\r\n");
}

function trigger(minutes: number): string {
  if (minutes % 1440 === 0) return `-P${minutes / 1440}D`;
  if (minutes % 60 === 0) return `-PT${minutes / 60}H`;
  return `-PT${minutes}M`;
}

export function buildICS(event: ICSEvent): string {
  const start =
    typeof event.startUTC === "string" ? new Date(event.startUTC) : event.startUTC;
  const end = new Date(start.getTime() + event.durationMinutes * 60_000);
  const cancelled = event.cancelled ?? false;
  const sequence = event.sequence ?? 0;
  const alarm =
    event.alarmMinutesBefore === undefined ? 1440 : event.alarmMinutesBefore;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${event.prodId ?? PROD_ID}`,
    "CALSCALE:GREGORIAN",
    `METHOD:${cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${toICSDate(event.dtstamp ?? new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escapeText(event.summary)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.description)
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.url) lines.push(`URL:${escapeText(event.url)}`);
  lines.push(`STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`);
  lines.push(`SEQUENCE:${sequence}`);
  if (!cancelled && alarm != null) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Reminder",
      `TRIGGER:${trigger(alarm)}`,
      "END:VALARM",
    );
  }
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Compose an .ics from appointment fields (stable UID + "service @ spot"). */
export function buildAppointmentICS(args: {
  appointmentId: string;
  startUTC: string | Date;
  durationMinutes: number;
  serviceName: string;
  spotName: string;
  location?: string | null;
  phone?: string | null;
  bookingUrl?: string | null;
  appUrl?: string | null;
  sequence?: number;
  cancelled?: boolean;
  dtstamp?: Date;
}): string {
  const description: string[] = [];
  if (args.phone) description.push(`Phone: ${args.phone}`);
  if (args.bookingUrl) description.push(`Booking: ${args.bookingUrl}`);
  if (args.appUrl) description.push(args.appUrl);
  description.push("Scheduled via Beauty Scheduler");

  return buildICS({
    uid: `${args.appointmentId}@beauty-scheduler`,
    startUTC: args.startUTC,
    durationMinutes: args.durationMinutes,
    summary: `${args.serviceName} @ ${args.spotName}`,
    location: args.location ?? null,
    description: description.join("\n"),
    url: args.appUrl ?? null,
    sequence: args.sequence ?? 0,
    cancelled: args.cancelled ?? false,
    dtstamp: args.dtstamp,
  });
}
