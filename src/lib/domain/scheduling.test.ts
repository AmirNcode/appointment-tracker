import { describe, it, expect } from "vitest";
import {
  addInterval,
  nextDueDate,
  preAppointmentSendAt,
  reminderSendAt,
  zonedDateTimeToUTC,
} from "./scheduling";

describe("addInterval — day", () => {
  it("adds a single day", () => {
    expect(addInterval("2026-01-01", 1, "day")).toBe("2026-01-02");
  });
  it("rolls across a month boundary", () => {
    expect(addInterval("2026-01-31", 1, "day")).toBe("2026-02-01");
  });
  it("rolls across a year boundary", () => {
    expect(addInterval("2026-12-31", 1, "day")).toBe("2027-01-01");
  });
});

describe("addInterval — week", () => {
  it("nails every 5 weeks (35 days)", () => {
    // Jan 1 + 35 days → Feb 5
    expect(addInterval("2026-01-01", 5, "week")).toBe("2026-02-05");
  });
  it("waxing every 6 weeks (42 days)", () => {
    expect(addInterval("2026-01-01", 6, "week")).toBe("2026-02-12");
  });
});

describe("addInterval — month (calendar-aware clamping)", () => {
  it("keeps the same day when it exists", () => {
    expect(addInterval("2026-01-15", 2, "month")).toBe("2026-03-15");
  });
  it("clamps Jan 31 + 1 month → Feb 28 (non-leap)", () => {
    expect(addInterval("2026-01-31", 1, "month")).toBe("2026-02-28");
  });
  it("clamps Jan 31 + 1 month → Feb 29 (leap year 2028)", () => {
    expect(addInterval("2028-01-31", 1, "month")).toBe("2028-02-29");
  });
  it("clamps Mar 31 + 1 month → Apr 30", () => {
    expect(addInterval("2026-03-31", 1, "month")).toBe("2026-04-30");
  });
  it("rolls over the year (Dec 15 + 1 month → Jan 15)", () => {
    expect(addInterval("2026-12-15", 1, "month")).toBe("2027-01-15");
  });
  it("crosses the year and clamps (Nov 30 + 3 months → Feb 28)", () => {
    expect(addInterval("2026-11-30", 3, "month")).toBe("2027-02-28");
  });
  it("handles 12 months (a full year)", () => {
    expect(addInterval("2026-06-09", 12, "month")).toBe("2027-06-09");
  });
});

describe("nextDueDate", () => {
  it("is equivalent to addInterval", () => {
    expect(nextDueDate("2026-01-01", 5, "week")).toBe(
      addInterval("2026-01-01", 5, "week"),
    );
  });
});

describe("validation", () => {
  it("rejects a zero or negative frequency", () => {
    expect(() => addInterval("2026-01-01", 0, "week")).toThrow();
    expect(() => addInterval("2026-01-01", -2, "month")).toThrow();
  });
  it("rejects a non-integer frequency", () => {
    expect(() => addInterval("2026-01-01", 1.5, "day")).toThrow();
  });
  it("rejects a malformed date", () => {
    expect(() => addInterval("06/09/2026", 1, "day")).toThrow();
    expect(() => addInterval("2026-6-9", 1, "day")).toThrow();
  });
  it("rejects a non-calendar date", () => {
    expect(() => addInterval("2026-02-30", 1, "day")).toThrow();
  });
});

describe("reminderSendAt", () => {
  it("is 7 days before the due date at 13:00 UTC by default", () => {
    expect(reminderSendAt("2026-06-09")).toBe("2026-06-02T13:00:00.000Z");
  });
  it("respects a custom lead time", () => {
    expect(reminderSendAt("2026-06-09", 1)).toBe("2026-06-08T13:00:00.000Z");
  });
  it("handles month/year boundaries", () => {
    expect(reminderSendAt("2027-01-03")).toBe("2026-12-27T13:00:00.000Z");
  });
});

describe("zonedDateTimeToUTC", () => {
  it("converts an EDT (summer) wall time to UTC", () => {
    // Toronto is UTC-4 in July → 14:30 local = 18:30 UTC.
    expect(zonedDateTimeToUTC("2026-07-15T14:30", "America/Toronto")).toBe(
      "2026-07-15T18:30:00.000Z",
    );
  });
  it("converts an EST (winter) wall time to UTC", () => {
    // Toronto is UTC-5 in January → 09:00 local = 14:00 UTC.
    expect(zonedDateTimeToUTC("2026-01-15T09:00", "America/Toronto")).toBe(
      "2026-01-15T14:00:00.000Z",
    );
  });
  it("is the identity for UTC", () => {
    expect(zonedDateTimeToUTC("2026-07-15T14:30", "UTC")).toBe(
      "2026-07-15T14:30:00.000Z",
    );
  });
  it("rejects a malformed datetime", () => {
    expect(() => zonedDateTimeToUTC("nope", "UTC")).toThrow();
  });
});

describe("preAppointmentSendAt", () => {
  it("defaults to 7 days before the confirmed instant", () => {
    expect(preAppointmentSendAt("2026-07-15T18:30:00.000Z")).toBe(
      "2026-07-08T18:30:00.000Z",
    );
  });
  it("respects a custom lead time", () => {
    expect(preAppointmentSendAt("2026-07-15T18:30:00.000Z", 1)).toBe(
      "2026-07-14T18:30:00.000Z",
    );
  });
});
