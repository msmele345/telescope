# Ticket 3: The tour player and `/?tour=` links

> Source spec: `plans/v4-guided-tours.md`

**What to build:** Opening `/?tour=<slug>` runs that tour on the home map from stop 1. It uses
ticket 1's time-finder and the fixture tour, and ticket 2's camera director.

- **On start:** compute the tour time for the current observer (`DEFAULT_OBSERVER` if none is
  saved), remember the previous virtual time and play mode, pause, and `scrubTo` the tour time.
  **Never change the observer.** If the tour time isn't tonight, say so: "Showing the sky on
  Jun 21, 9:30pm, the next evening this tour is visible from you."
- **Panel:** heading, markdown body, "Stop n of N", Back / Next / Exit. Constellation stops show
  a "Read the full lesson →" link. Star and Messier stops open the existing popup.
- **User-paced:** no timers. The state is the current stop number.
- **Scrubber frozen:** it stays visible and shows the tour time, play and drag are disabled, and
  a tooltip explains why.
- **End / Exit:** offer "Return to <previous time>" (restores the previous virtual time *and*
  play mode) or "Stay here". The FOV returns to 75°.
- **Keyboard:** ← / → and Esc. The panel is plain DOM text and is fully usable by screen reader.
- An unknown slug is ignored, and the map loads normally.

Component tests with the canvas stubbed and a fake clock. Build test-first.

**Blocked by:** #1 Tour format and the time-finder, #2 Point and zoom the view from code.

- [ ] `/?tour=<slug>` starts the tour at stop 1 with no confirmation step; an unknown slug does nothing.
- [ ] The observer (state, localStorage and DB) is never modified by a tour.
- [ ] Next / Back / ← / → move between stops; Esc exits.
- [ ] The scrubber is disabled during a tour and shows the tour time.
- [ ] Exit → "Return" restores the previous virtual time and play mode; "Stay" keeps the tour time.
- [ ] A tour whose next evening isn't tonight shows the jump label.
- [ ] Star and Messier stops open their popup; constellation stops link to the lesson.
- [ ] Works with no saved location, and the location banner is unchanged.
- [ ] Full test suite passes; `next build` succeeds.
- [ ] **Verified on a Vercel preview deploy** with the fixture tour, end to end.
