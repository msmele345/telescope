import { formatNightOf } from "./night-of";
import { returnsToNow, type SavedTime } from "./session";

const CLOCK_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const MONTH_DAY_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const MONTH_DAY_YEAR_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** A compact device-timezone clock time, e.g. "11:30pm". */
export function formatClock(at: Date): string {
  let hm = "";
  let period = "";
  for (const part of CLOCK_FMT.formatToParts(at)) {
    if (part.type === "hour" || part.type === "minute") hm += part.value;
    else if (part.type === "literal" && part.value === ":") hm += ":";
    else if (part.type === "dayPeriod") period = part.value.toLowerCase();
  }
  return hm + period;
}

/** The panel's note when the tour time is not tonight. */
export function jumpLabel(at: Date): string {
  return (
    `Showing the sky on the night of ${formatNightOf(at)}, ${formatClock(at)}, ` +
    "the next evening this tour is visible from you."
  );
}

/** The "Return" button's text, given the time it would return to from `realNow`. */
export function returnLabel(saved: SavedTime, realNow: Date): string {
  if (returnsToNow(saved)) return "Return to now";
  const target = new Date(realNow.getTime() + saved.offsetMs);
  const fmt =
    target.getFullYear() === realNow.getFullYear() ? MONTH_DAY_FMT : MONTH_DAY_YEAR_FMT;
  return `Return to ${fmt.format(target)}, ${formatClock(target)}`;
}
