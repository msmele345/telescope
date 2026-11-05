# Ticket 5: The four launch tours (content PR)

> Source spec: `plans/v4-guided-tours.md`

**What to build:** Four tour files in `content/tours/`, with commentary drafted by the agent and
**reviewed by the maintainer** in this PR before merge. This PR is content only, plus removing
the fixture tour from ticket 1.

| Slug | Window | Stops |
|---|---|---|
| `winter-hexagon` | Dec–Mar | Ori → Betelgeuse (2061) → M42 → Tau → Aldebaran (1457) → M45 → Sirius (2491) |
| `arc-to-arcturus` | Mar–Jun | UMa → Arcturus (5340) → Boo → Spica (5056) → Vir |
| `summer-triangle` | Jun–Sep | Lyr → Vega (7001) → M57 → Cyg → Deneb (7924) → Aql → Altair (7557) |
| `andromedas-neighborhood` | Sep–Dec | Peg → And → M31 → Cas → Per |

**Commentary rules:**
- Two to four sentences per stop, in the voice of the existing lessons.
- Each stop says how to get there from the previous one (the star-hop). This is the teaching point.
- Numbers (distance, magnitude) must match the star and Messier catalogs. Star names must match
  the star popup.
- No invented mythology. Use the lessons as the source for any story.

**Sirius is the tight case:** it peaks at about 24° from 49°N. If the content test fails, widen
or shift the window, or drop the stop. Don't lower the 20° bar.

**Blocked by:** #1 Tour format and the time-finder. Can run alongside #2–#4.

- [ ] Four tour files exist with the stops above, and the fixture tour is removed.
- [ ] The content test passes for all four from both 25°N and 49°N.
- [ ] Every distance and magnitude in the commentary matches the catalogs.
- [ ] Maintainer has reviewed and approved the commentary.
- [ ] Once #3 has merged: each tour played end to end on a Vercel preview deploy.
