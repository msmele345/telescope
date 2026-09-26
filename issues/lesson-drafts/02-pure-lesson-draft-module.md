# Ticket 2: Pure lesson-draft module

> Source spec: `plans/v2-lesson-drafts.md`

**What to build:** Every decision the drafting script makes, expressed as pure functions over
plain data, living with the other pure script helpers and tested the way they are. Nothing
user-facing ships here; this is what the script plumbs into.

- **Fact sheet** — `buildLessonFacts(abbr, stars, messier)`: name, genitive, abbreviation;
  Mythology or History (Ptolemy's 48 map to **50** IAU names because Argo Navis became Carina,
  Puppis and Vela — keep this as data with an asserted count of 50; Crux and Coma Berenices are
  *not* on it); the brightest five to eight members with proper name, Bayer designation,
  magnitude, distance and colour temperature; every Messier object in the constellation; best
  season and favoured hemisphere from its centre, taken as the mean position of its member stars
  with right ascension averaged circularly (no centroid helper exists today).
- **Request** — `buildLessonRequest(facts, examples)`: one Message Batches request on Claude
  Opus 5 with adaptive thinking and effort set explicitly to medium; style examples are the Orion, Ursa Minor and Libra lessons;
  instructions require the four-section format, no frontmatter, about 35 lines, numbers only
  from the fact sheet, and the History section where the fact sheet says so. The shared prefix
  is byte-identical across constellations; the custom id is the slug.
- **Draft checks** — `checkLessonDraft(mdx, facts)`: structural problems (frontmatter, a
  missing or out-of-order section, the wrong Mythology/History heading, length outside roughly
  20–60 lines) **reject**; a distance or magnitude not matching the fact sheet within display
  rounding, an unknown proper star name, or an unknown Messier id **flag**.

**Blocked by:** None — can start immediately.

- [ ] Fact sheet: brightest members in magnitude order; all and only the constellation's own Messier objects; correct season and hemisphere for a northern, a southern and an equatorial constellation.
- [ ] Fact sheet: handles a constellation with no named stars and one with no Messier objects.
- [ ] Fact sheet: marks a modern constellation for History and a classical one for Mythology, including all three Argo Navis constellations.
- [ ] Request: carries the fact sheet and all three style examples; names the constellation; uses the slug as custom id; shared prefix identical across two constellations.
- [ ] Checks: frontmatter, a missing section, sections out of order, the wrong heading, and a wildly wrong length each reject.
- [ ] Checks: an invented distance, an invented magnitude, an unknown star name and an unknown Messier id each flag; a legitimately rounded value ("about 860 light-years") does not.
- [ ] Fact sheet: the classical list has exactly 50 entries; a constellation straddling 0h right ascension (e.g. Andromeda, Pisces) gets the right season.
- [ ] Request: effort is medium.
- [ ] **Calibration: every one of the 15 handwritten lessons passes cleanly against its own fact sheet.** Where a lesson genuinely disagrees with the catalog, correct it by hand and say in the PR which source won.
