// T4.1 — Pure scheduling math. No I/O, no timezone surprises (UTC calendar
// arithmetic). Works on calendar dates as "YYYY-MM-DD" strings, matching the
// Postgres `date` columns (due_date, anchor_date).

export type FrequencyUnit = "day" | "week" | "month";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseISODate(iso: string): { y: number; m: number; d: number } {
  if (typeof iso !== "string" || !ISO_DATE.test(iso)) {
    throw new Error(`Invalid date, expected "YYYY-MM-DD": ${iso}`);
  }
  const [y, m, d] = iso.split("-").map(Number);
  // Reject non-calendar dates like 2026-02-30.
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error(`Not a real calendar date: ${iso}`);
  }
  return { y, m, d };
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Number of days in a 1-based month of a given year. */
function daysInMonth(year: number, month1: number): number {
  // Day 0 of the next month == last day of this month.
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/**
 * Add a frequency interval to a calendar date.
 * - `day` / `week`: exact day arithmetic.
 * - `month`: calendar-aware, clamping to the last valid day so that, e.g.,
 *   Jan 31 + 1 month → Feb 28 (or Feb 29 in a leap year), not March 3.
 */
export function addInterval(
  dateISO: string,
  value: number,
  unit: FrequencyUnit,
): string {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Frequency value must be a positive integer, got: ${value}`);
  }
  const { y, m, d } = parseISODate(dateISO);

  if (unit === "day" || unit === "week") {
    const days = unit === "week" ? value * 7 : value;
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  if (unit === "month") {
    const monthsFromZero = m - 1 + value;
    const ny = y + Math.floor(monthsFromZero / 12);
    const nm = (monthsFromZero % 12) + 1; // back to 1-based
    const nd = Math.min(d, daysInMonth(ny, nm));
    return toISO(ny, nm, nd);
  }

  throw new Error(`Unknown frequency unit: ${unit}`);
}

/**
 * The next due date for a service: the last visit date (or the service's
 * anchor date) plus its frequency. See DESIGN §4.5.
 */
export function nextDueDate(
  lastVisitISO: string,
  frequencyValue: number,
  frequencyUnit: FrequencyUnit,
): string {
  return addInterval(lastVisitISO, frequencyValue, frequencyUnit);
}

/**
 * When to send the "due soon" reminder: `leadDays` before the due date, at
 * 13:00 UTC (~9am Eastern — the daily cron's window). Returns an ISO timestamp.
 */
export function reminderSendAt(dueDateISO: string, leadDays = 7): string {
  const { y, m, d } = parseISODate(dueDateISO);
  return new Date(Date.UTC(y, m - 1, d - leadDays, 13, 0, 0)).toISOString();
}

/** Today's calendar date ("YYYY-MM-DD") in the given IANA timezone. */
export function todayInTimeZone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Convert a timezone-naive wall-clock datetime (e.g. "2026-07-15T14:30" from an
 * `<input type="datetime-local">`), interpreted in `timeZone`, to a UTC ISO
 * instant for a `timestamptz` column. The zone offset is sampled at the given
 * instant, so a value inside a DST transition hour can be off by 1h — an
 * acceptable edge for v1 appointment times.
 */
export function zonedDateTimeToUTC(wallClock: string, timeZone: string): string {
  const asIfUTC = new Date(`${wallClock}Z`);
  if (Number.isNaN(asIfUTC.getTime())) {
    throw new Error(
      `Invalid datetime, expected "YYYY-MM-DDTHH:mm": ${wallClock}`,
    );
  }
  // The same instant rendered as wall-clock in `timeZone` vs UTC differs by the
  // zone's offset; the runtime's own tz cancels across the two renderings.
  const tzWall = new Date(asIfUTC.toLocaleString("en-US", { timeZone }));
  const utcWall = new Date(asIfUTC.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = tzWall.getTime() - utcWall.getTime();
  return new Date(asIfUTC.getTime() - offsetMs).toISOString();
}

/**
 * When to send the "pre-appointment" reminder: `leadDays` before a confirmed
 * appointment instant. Returns an ISO timestamp. See DESIGN §3.2.
 */
export function preAppointmentSendAt(
  confirmedUTCISO: string,
  leadDays = 7,
): string {
  const t = new Date(confirmedUTCISO);
  if (Number.isNaN(t.getTime())) {
    throw new Error(`Invalid datetime: ${confirmedUTCISO}`);
  }
  return new Date(t.getTime() - leadDays * 24 * 60 * 60 * 1000).toISOString();
}
