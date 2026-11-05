# Tickets: Telescope v4 — Guided Sky Tours

Hand-written tours that set the map to the next evening the tour is visible from the visitor's
location, then move and zoom from stop to stop at the visitor's pace. Source spec:
`plans/v4-guided-tours.md`.

Work the **frontier**: any ticket whose blockers are all done. Tickets 1 and 2 can both start
immediately. Ticket 5 needs only ticket 1, so the commentary review can run alongside the UI work.

Ticket 5 is **agent-drafted, maintainer-reviewed** content.

| # | Ticket | Blocked by |
|---|---|---|
| 1 | [Tour format and the time-finder](01-tour-format-and-time-finder.md) | none |
| 2 | [Point and zoom the view from code](02-camera-director.md) | none |
| 3 | [The tour player and `/?tour=` links](03-tour-player.md) | 1, 2 |
| 4 | [Tours list on the map, and "Appears in" on lessons](04-tours-list-and-lesson-links.md) | 3 |
| 5 | [The four launch tours (content PR)](05-launch-tours-content.md) | 1 |
