import { describe, it, expect } from "vitest";
import { buildICS, buildAppointmentICS } from "./ics";

const DTSTAMP = new Date("2026-06-09T13:00:00Z");
// Unfold (undo CRLF + single-space continuations) before content assertions.
const unfold = (s: string) => s.replace(/\r\n /g, "");

const base = {
  uid: "appt-1@beauty-scheduler",
  startUTC: "2026-07-15T18:30:00Z",
  durationMinutes: 60,
  summary: "Pedicure @ Glow Spa",
  location: "123 King St W, Toronto",
  dtstamp: DTSTAMP,
};

describe("buildICS", () => {
  it("wraps a VCALENDAR/VEVENT with CRLF line endings", () => {
    const ics = buildICS(base);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("\r\nBEGIN:VEVENT\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
  });

  it("emits UID, DTSTAMP, DTSTART and a DTEND computed from the duration", () => {
    const ics = buildICS(base);
    expect(ics).toContain("UID:appt-1@beauty-scheduler");
    expect(ics).toContain("DTSTAMP:20260609T130000Z");
    expect(ics).toContain("DTSTART:20260715T183000Z");
    expect(ics).toContain("DTEND:20260715T193000Z"); // +60 min
  });

  it("defaults to PUBLISH + CONFIRMED with a 1-day VALARM and SEQUENCE 0", () => {
    const ics = buildICS(base);
    expect(ics).toContain("METHOD:PUBLISH");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).toContain("SEQUENCE:0");
  });

  it("escapes commas and semicolons in TEXT values", () => {
    const ics = buildICS({ ...base, summary: "Cut, color; style" });
    expect(ics).toContain("SUMMARY:Cut\\, color\\; style");
  });

  it("makes a cancellation: METHOD:CANCEL, STATUS:CANCELLED, bumped SEQUENCE, no alarm", () => {
    const ics = buildICS({ ...base, cancelled: true, sequence: 2 });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("SEQUENCE:2");
    expect(ics).not.toContain("BEGIN:VALARM");
  });

  it("folds physical lines to the 75-octet limit", () => {
    const ics = buildICS({ ...base, location: "X".repeat(120) });
    const lines = ics.split("\r\n");
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(75);
    expect(lines.some((l) => l.startsWith(" "))).toBe(true); // a continuation
    expect(unfold(ics)).toContain(`LOCATION:${"X".repeat(120)}`);
  });

  it("omits VALARM when alarmMinutesBefore is null", () => {
    const ics = buildICS({ ...base, alarmMinutesBefore: null });
    expect(ics).not.toContain("BEGIN:VALARM");
  });
});

describe("buildAppointmentICS", () => {
  it("composes a stable UID, a 'service @ spot' summary, and a description", () => {
    const ics = buildAppointmentICS({
      appointmentId: "abc-123",
      startUTC: "2026-07-15T18:30:00Z",
      durationMinutes: 90,
      serviceName: "Haircut",
      spotName: "Glow Spa",
      location: "1 Main St",
      phone: "+1 555 0100",
      appUrl: "https://app.example.com/appointments/abc-123",
      sequence: 0,
      dtstamp: DTSTAMP,
    });
    expect(ics).toContain("UID:abc-123@beauty-scheduler");
    expect(ics).toContain("SUMMARY:Haircut @ Glow Spa");
    expect(ics).toContain("DTEND:20260715T200000Z"); // +90 min
    expect(unfold(ics)).toContain("Scheduled via Beauty Scheduler");
  });
});
