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
- [ ] Content test: for every tour, slug matches the filename, 5–7 stops, every ID resolves in its catalog, and `findTourTime` is non-null from both 25°N and 49°N.
- [ ] Full test suite passes; `next build` succeeds.
