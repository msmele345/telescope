import { describe, expect, it } from "vitest";
import { nextTourLabel, sortByTourTime, type Tour, type TourTime } from "@/lib/tours";

function tour(slug: string): Tour {
  return {
    slug,
    title: slug,
    summary: "",
    window: { from: { month: 1, day: 1 }, to: { month: 12, day: 31 } },
    stops: [],
  };
}

// Local-time Date constructor: these hold in any device timezone.
const at = (month: number, day: number, hour: number, minute = 0) =>
  new Date(2027, month - 1, day, hour, minute);

describe("sortByTourTime", () => {
  it("puts the soonest tour time first", () => {
    const entries = [
      { tour: tour("later"), time: { at: at(3, 2, 21), tonight: false } },
      { tour: tour("tonight"), time: { at: at(1, 10, 20, 40), tonight: true } },
      { tour: tour("soon"), time: { at: at(1, 12, 21), tonight: false } },
    ];
    expect(sortByTourTime(entries).map((e) => e.tour.slug)).toEqual([
      "tonight",
      "soon",
      "later",
    ]);
  });

  it("lists tours with no tour time last, in registry order", () => {
    const entries = [
      { tour: tour("none-a"), time: null },
      { tour: tour("dated"), time: { at: at(6, 1, 22), tonight: false } },
      { tour: tour("none-b"), time: null },
    ];
    expect(sortByTourTime(entries).map((e) => e.tour.slug)).toEqual([
      "dated",
      "none-a",
      "none-b",
    ]);
  });

  it("does not reorder its input", () => {
    const entries = [
      { tour: tour("b"), time: { at: at(2, 1, 21), tonight: false } },
      { tour: tour("a"), time: { at: at(1, 1, 21), tonight: false } },
    ];
    sortByTourTime(entries);
    expect(entries.map((e) => e.tour.slug)).toEqual(["b", "a"]);
  });
});

describe("nextTourLabel", () => {
  it("reads 'Tonight' with the clock time for a tour time tonight", () => {
    expect(nextTourLabel({ at: at(1, 10, 20, 40), tonight: true })).toBe(
      "Next: Tonight 8:40pm"
    );
  });

  it("reads 'Tonight' for a tour time after 12am on the clock but before solar midnight", () => {
    const time: TourTime = { at: at(6, 22, 0, 40), tonight: true };
    expect(nextTourLabel(time)).toBe("Next: Tonight 12:40am");
  });

  it("names the night-of date for a later evening", () => {
    expect(nextTourLabel({ at: at(1, 12, 21), tonight: false })).toBe("Next: Jan 12");
  });

  it("uses the evening's date for a later instant after 12am", () => {
    expect(nextTourLabel({ at: at(6, 22, 0, 40), tonight: false })).toBe("Next: Jun 21");
  });

  it("trusts the tonight flag over the calendar date", () => {
    // An instant on a later calendar date that the time-finder still calls tonight.
    expect(nextTourLabel({ at: at(1, 11, 0, 30), tonight: true })).toMatch(/^Next: Tonight/);
  });

  it("says the tour can't be seen when there is no tour time", () => {
    expect(nextTourLabel(null)).toBe("Not visible from your location");
  });
});
