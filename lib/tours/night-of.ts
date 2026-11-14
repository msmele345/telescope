const HALF_DAY_MS = 12 * 60 * 60 * 1000;

const NIGHT_OF_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

/**
 * The night-of date of an evening instant, in the device timezone, e.g.
 * "Jun 21". An evening can run past 12am on the clock, so 12:40am on Jun 22
 * belongs to the night of Jun 21. Taking the date of `at` minus 12 hours
 * gives that.
 */
export function formatNightOf(at: Date): string {
  return NIGHT_OF_FMT.format(new Date(at.getTime() - HALF_DAY_MS));
}
