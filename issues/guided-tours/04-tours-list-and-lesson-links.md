# Ticket 4: Tours list on the map, and "Appears in" on lessons

> Source spec: `plans/v4-guided-tours.md`

**What to build:** Two ways into tours. Both just link to `/?tour=<slug>`.

- **Tours button on the map** opens a small list: title, summary, number of stops, and
  "Next: Tonight 8:40pm" / "Next: Jan 12" from `findTourTime` for the current observer. **Sorted
  by tour time**, so tonight's tours come first. Every tour is playable, including out-of-season
  ones.
- **Lesson pages** show "Appears in: <Tour> →" for each tour with a stop in that constellation.
  A star or Messier stop counts toward its parent constellation (for example Sirius puts Winter
  Hexagon on Canis Major's page). Constellations with no tours show nothing.

The constellation-to-tours lookup is a pure function over the registry. Test it directly.

**Blocked by:** #3 The tour player and `/?tour=` links.

- [ ] The Tours button lists every registered tour with its next tour time, sorted soonest first.
- [ ] Choosing a tour starts it (via `/?tour=`).
- [ ] The list is keyboard-operable and announces as a list to screen readers.
- [ ] Pure test: the constellation → tours lookup, including star and Messier stops mapping to their parent constellation.
- [ ] Lesson pages show "Appears in" links only when the constellation is in a tour.
- [ ] Full test suite passes; `next build` succeeds.
