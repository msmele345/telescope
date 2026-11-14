import { describe, expect, it } from "vitest";
import { formatNightOf } from "@/lib/tours";

// Built with the local-time Date constructor, so these hold in whatever
// timezone the test machine is in: the helper reads the device timezone.
describe("formatNightOf", () => {
  it("names the evening's date for an instant after 12am", () => {
    expect(formatNightOf(new Date(2027, 5, 22, 0, 40))).toBe("Jun 21");
  });

  it("names the same date for an instant before 12am", () => {
    expect(formatNightOf(new Date(2027, 5, 21, 23, 30))).toBe("Jun 21");
    expect(formatNightOf(new Date(2027, 5, 21, 19, 0))).toBe("Jun 21");
  });

  it("names the previous year's date for an instant after 12am on Jan 1", () => {
    expect(formatNightOf(new Date(2028, 0, 1, 1, 15))).toBe("Dec 31");
  });
});
