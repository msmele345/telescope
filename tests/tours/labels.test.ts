import { describe, expect, it } from "vitest";
import { formatClock, jumpLabel, returnLabel } from "@/lib/tours";

// Local-time Date constructor: these hold in any device timezone.
describe("formatClock", () => {
  it("writes a compact 12-hour time", () => {
    expect(formatClock(new Date(2027, 5, 21, 23, 30))).toBe("11:30pm");
    expect(formatClock(new Date(2027, 5, 22, 0, 40))).toBe("12:40am");
    expect(formatClock(new Date(2027, 5, 21, 20, 5))).toBe("8:05pm");
  });
});

describe("jumpLabel", () => {
  it("names the night-of date and the clock time", () => {
    expect(jumpLabel(new Date(2027, 5, 21, 23, 30))).toBe(
      "Showing the sky on the night of Jun 21, 11:30pm, the next evening this tour is visible from you."
    );
  });

  it("uses the evening's date for an instant after 12am", () => {
    expect(jumpLabel(new Date(2027, 5, 22, 0, 40))).toMatch(/night of Jun 21, 12:40am,/);
  });
});

describe("returnLabel", () => {
  const now = new Date(2027, 2, 1, 20, 0);

  it("reads 'Return to now' when the offset is under a minute", () => {
    expect(returnLabel({ mode: "running", speed: 1, offsetMs: 2_000 }, now)).toBe(
      "Return to now"
    );
  });

  it("names the time it will return to otherwise", () => {
    const offsetMs = new Date(2027, 2, 3, 21, 0).getTime() - now.getTime();
    expect(returnLabel({ mode: "paused", speed: 1, offsetMs }, now)).toBe(
      "Return to Mar 3, 9:00pm"
    );
  });

  it("adds the year when it is not this year", () => {
    const offsetMs = new Date(2026, 11, 31, 21, 0).getTime() - now.getTime();
    expect(returnLabel({ mode: "paused", speed: 1, offsetMs }, now)).toBe(
      "Return to Dec 31, 2026, 9:00pm"
    );
  });
});
