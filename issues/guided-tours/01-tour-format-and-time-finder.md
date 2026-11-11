# Ticket 1: Tour format and the time-finder

> Source spec: `plans/v4-guided-tours.md`

**What to build:** The `Tour` / `TourStop` types, a registry that loads every tour file in
`content/tours/`, and the pure `findTourTime(tour, observer, after, catalogs)` function. It
returns the earliest evening within the tour window, searching up to a year ahead, at which
every stop is above 20° altitude, or `null`. Nothing user-facing ships. This is the logic the
rest of the work relies on, and proving it first removes the biggest risk.

**"Evening" uses the Sun, not the clock:** the Sun is more than 12° below the horizon, and the
time is before local solar midnight worked out from longitude. Do not introduce a timezone source.
Results are displayed in the device's timezone later, and the computation doesn't need one.

**It returns `{ at: Date; tonight: boolean } | null`, not a bare `Date`.** `tonight` is true when
`at` falls before the first local solar midnight after `after`. An evening instant can display
as after 12am on the next calendar date, so the UI must not work "tonight" out from the date.
Also add the small display helper for the **night-of date** (the device-timezone date of `at`
minus 12 hours), which tickets 3 and 4 use for labels.

A constellation's position is the average direction of its line-figure vertices. Stars and
Messier objects use catalog RA/Dec. Reuse `lib/sky-math` and the Sun from `lib/solar-system`.

Build it test-first (red/green/refactor). Model the tests on the time-controller reducer tests:
explicit observer, explicit `after`, one behaviour per test.

Commit one small **fixture tour** (for example three stops in Orion) so the content test has
something to run against before ticket 5 lands. Ticket 5 replaces it.

**Blocked by:** None. Can start immediately.

- [ ] `Tour` / `TourStop` types match the spec; star IDs are numbers, constellation IDs are IAU abbreviations, Messier IDs are `M<n>` strings.
- [ ] Adding a tour means adding one file to `content/tours/` (plus at most one registry line, kept honest by a test).
- [ ] `findTourTime` returns an instant where every stop is above 20° and the Sun is below −12°.
- [ ] It returns the *earliest* qualifying evening, never a pre-dawn time.
- [ ] It handles a window that wraps the year end (for example Nov–Feb).
- [ ] It returns `null` for a tour that is never visible from the observer's latitude.
- [ ] `tonight` is true for an instant later this evening, including one after 12am on the clock, and false for tomorrow evening.
- [ ] The night-of date helper returns the evening's date for an instant after 12am.
- [ ] A constellation whose line figure straddles RA 0h (Pegasus) gets a sensible average direction.
- [ ] Content test: for every tour, slug matches the filename, 5–7 stops, every ID resolves in its catalog, and, searching from the first day of the tour window in a fixed year, `findTourTime` returns an evening within 14 days of the window start from both 25°N and 49°N.
- [ ] Full test suite passes; `next build` succeeds.
