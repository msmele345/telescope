# Spec: Telescope v4 — Guided Sky Tours

> Status: ready for implementation.
> Decided in a grilling session on 2026-11-04. Tickets: `issues/guided-tours/`.

## Problem Statement

Telescope shows a beautiful sky and has a lesson for every one of the 88 constellations, but it
leaves a newcomer to find their own way through both. A student who opens the map sees thousands
of stars and has no idea where to look first. The lessons explain how to find Orion, but nothing
on the map *takes* them there. The two halves of the product, the sky and the stories, are only
connected by the visitor's own curiosity.

The "wow" moment the PRD treats as the main differentiator happens by accident today. Nothing
in the product deliberately stages it.

## Solution

A **tour** is a short, hand-written route through the sky: five to seven stops, each a
constellation, a named star, or a Messier object. Starting one sets the map to the next evening
when every stop is well above the horizon *from the visitor's own location*, then swings and
zooms the view from stop to stop as the visitor presses **Next**, with a few sentences of
commentary at each.

Four seasonal star-hopping tours ship at launch, so there is always one visible within a few
months. Each tour is a single typed file, and a test proves every tour is real and visible.
The same player is designed to run a generated "Tonight's tour" later (see *Future*).

## User Stories

### Visitors

1. As a visitor, I want to start a tour from the map, so that someone shows me where to look.
2. As a visitor, I want the tour to show me *my* sky, from where I live, so that I can go
   outside and find the same things.
3. As a visitor, I want to know before I start when a tour is next visible, so that I can pick
   one I could actually see tonight.
4. As a visitor, I want the view to move and zoom to each stop, so that I can tell what I'm
   looking at among thousands of stars.
5. As a visitor, I want to read each stop at my own pace and go back, so that I'm never rushed.
6. As a visitor, I want to look around freely between stops, so that the tour doesn't feel like
   it's taken over the map.
7. As a visitor, I want the star or Messier popup to open at those stops, so that I see the
   same facts I'd get by clicking it myself.
8. As a visitor, I want a link from a constellation stop to its full lesson, so that I can go
   deeper.
9. As a visitor reading a lesson, I want to see which tours include this constellation, so
   that I can see it in context on the map.
10. As a visitor, I want to share a tour by its URL, so that a friend lands on the same tour.
11. As a visitor, I want to choose at the end whether to return to the time I was viewing or
    stay at the tour's time.
12. As a visitor with reduced-motion enabled, I want the view to cut rather than fly.
13. As a keyboard or screen-reader user, I want to follow the whole tour without the canvas.
14. As a visitor who never set a location, I want tours to still work.

### Maintainer

15. As the maintainer, I want to add a tour by adding one file, so that tours are pure content.
16. As the maintainer, I want a test to fail if a tour names an object that doesn't exist, or
    can't be seen from anywhere in the contiguous US, so that a broken tour never ships.

## Implementation Decisions

### Scope

- **Hand-written tours only.** "Tonight's tour" is future work that reuses the same player.
- **Stops are fixed-sky objects only:** `constellation`, `star`, `messier`. Planets, the Sun and
  the Moon drift across the sky, which would make a hand-written tour go out of date and the
  time-finder depend on the year. They belong to "Tonight's tour".
- **Open to everyone.** Tours cost nothing to serve.
- **No user data.** Tours write nothing to the database. Reaching a stop does *not* mark a
  constellation viewed: "viewed" is a deliberate choice the user makes, and the PRD rules out
  progress tracking. A "Tours taken" profile history is a possible later ticket.

### Glossary

See `CONTEXT.md`: **Tour**, **Stop**, **Tour window**, **Tour time**.

### The tour file

One file per tour at `content/tours/<slug>.ts`, default-exporting a typed object:

```ts
type TourStop =
  | { kind: "constellation"; id: string /* IAU abbr, e.g. "Ori" */; heading: string; body: string }
  | { kind: "star"; id: number /* BSC id, e.g. 2061 */; heading: string; body: string }
  | { kind: "messier"; id: string /* e.g. "M42" */; heading: string; body: string };

interface Tour {
  slug: string;          // matches the filename
  title: string;
  summary: string;       // one sentence, shown in the tour list
  window: { from: MonthDay; to: MonthDay }; // the tour window, may wrap the year end
  stops: readonly TourStop[]; // 5–7
}
```

- `body` is short markdown, two to four sentences, written for the tour, not excerpted from
  lessons. Lessons are whole MDX pages with no per-star excerpts.
- Constellation stops render a "Read the full lesson →" link to `/constellations/<slug>`.
- Tours are found by a small registry module that imports every file in `content/tours/`.
  These are plain TS imports, not MDX, so they work in tests without a loader. If this ends up
  being a hand-kept list, the lessons-style test (every file is registered, every registered
  tour has a file) keeps it honest.

### The time-finder (pure function)

`findTourTime(tour, observer, after: Date, catalogs) → Date | null`

Finds the first **evening** at or after `after`, within the tour window (searching up to one year
ahead), at which **every stop is above 20° altitude** from `observer`.

- **"Evening"** means the Sun is more than 12° below the horizon (nautical darkness), and the
  time is before local solar midnight, which is worked out from longitude. Neither part needs a
  timezone, which sidesteps the open timezone question blocking "What's up tonight". Results are
  *displayed* in the device's timezone.
- **Stop position:** stars and Messier objects use catalog RA/Dec. A constellation uses the
  average direction of its line-figure vertices from `constellation-lines.json`.
- Built on the existing `sky-math` (`localSiderealTime`, `equatorialToHorizontal`) and the Sun
  from `solar-system`.
- Search granularity: nightly, stepping in 10-minute increments through each evening. Return the
  earliest qualifying instant.
- Returns `null` if no qualifying evening exists within a year. The tour content test (below)
  rules that out for every shipped tour at both US latitude extremes.

The **tour time** shown in the UI and used for sorting is this function's result for the
current observer, after now.

### View control (pointing and zoom)

Today `SkyCanvas` has a fixed 75° FOV, `enableZoom={false}`, and no programmatic camera API.
Tours add a **camera director** inside the canvas that, given a target direction and a field of
view, eases the view to them over ~1.5 s (ease-in-out, shortest arc).

- **Zoom is tour-only.** About 50° for a constellation (or fit to its outline), about 15° for a
  star or Messier object, and back to 75° when the tour ends. User zoom stays disabled
  everywhere. App-wide zoom is a separate decision (star sizes and picking are tuned for 75°).
- **Picking at zoom:** the point-picking threshold must stay correct at the narrower FOVs, so
  that clicking a star while zoomed still selects the right one.
- **Controls lock only during a transition.** Once the view settles, OrbitControls drag works
  again, and the next transition starts from wherever the user has dragged to.
- **Reduced motion:** with `prefers-reduced-motion`, cut instantly to the target view.
- **Highlight:** the current stop gets a ring around it (star and Messier stops) or brightened
  lines (constellation stops).

### The tour player

- Entered at **`/?tour=<slug>`**, the same deep-link pattern as `/?star=ID`. Every entry point
  links there, and an unknown slug is ignored. Opening the link goes straight to stop 1, with no
  confirmation step.
- **On start:** compute the tour time, pause the time controller and `scrubTo` the tour time,
  and remember the previous virtual time and play mode. The **observer is never changed.** With
  no saved location, use `DEFAULT_OBSERVER` and leave the existing location banner as it is.
- If the tour time is not tonight, the panel says so plainly: "Showing the sky on Jun 21,
  9:30pm, the next evening this tour is visible from you."
- **Panel:** heading, body (rendered markdown), "Stop 2 of 7", **Back** / **Next**, **Exit**.
  Star and Messier stops also open the existing `StarPopup` / `MessierPopup`.
- **User-paced.** No timers, no autoplay. The player's state is the current stop number.
- **Time scrubber frozen** while a tour runs: it stays visible and shows the tour time, but play
  and drag are disabled, with a tooltip "Time is set by the tour. Exit to change it."
- **End / Exit:** a choice of "Return to <previous time>" (restore the previous virtual time and
  play mode) or "Stay here". The FOV returns to 75°.
- **Keyboard:** ← / → move between stops, Esc exits. The panel is ordinary DOM text, so it
  works fully with a screen reader without the canvas.

### Entry points

- **Tours button on the map:** opens a small list with each tour's title, summary, number of
  stops and "Next: Tonight 8:40pm" / "Next: Jan 12". **Sorted by tour time**, so tonight's tours
  come first. Out-of-season tours still play. They jump ahead, and the panel labels the jump.
- **Lesson pages:** "Appears in: Winter Hexagon →" for every tour with a stop in that
  constellation. A star or Messier stop counts toward its parent constellation.
- A `/tours` index page is **deferred** until there are enough tours to need one.

### Launch tours

Commentary is drafted by the agent and reviewed by the maintainer in its own PR.

| Slug | Window | Stops (IDs verified against the catalogs) |
|---|---|---|
| `winter-hexagon` | Dec–Mar | Ori → Betelgeuse (2061) → M42 → Tau → Aldebaran (1457) → M45 → Sirius (2491) |
| `arc-to-arcturus` | Mar–Jun | UMa → Arcturus (5340) → Boo → Spica (5056) → Vir |
| `summer-triangle` | Jun–Sep | Lyr → Vega (7001) → M57 → Cyg → Deneb (7924) → Aql → Altair (7557) |
| `andromedas-neighborhood` | Sep–Dec | Peg → And → M31 → Cas → Per |

The tightest case is Sirius (Dec −16.7°), which peaks at only about 24° from 49°N, so
`winter-hexagon` has a narrow nightly window up north. The content test is the final judge.
If it fails, adjust the window or drop the stop rather than lowering the 20° bar.

## Testing Decisions

### What makes a good test here

The risky logic is pure: which evening, and is every stop up. Test that hard with fixed inputs.
Test the camera as a pure easing/interpolation function. Test the player as a component, with
the canvas stubbed. Don't try to assert on WebGL output.

### Seam 1: the time-finder (pure, new)

Modelled on the time-controller reducer tests: explicit observer, explicit `after` instant, one
behaviour per test. Cases: returns an instant where every stop is above 20° and the Sun is below
−12°; returns the *earliest* such evening; respects a window that wraps the year end; returns
`null` for an impossible tour (a stop below the horizon all year from that latitude); doesn't
return a pre-dawn time.

### Seam 2: tour content (data test, new)

For every tour in `content/tours/`: slug matches the filename; 5–7 stops; every constellation ID
is a real constellation with a line figure; every star ID is in `bsc5.json`; every Messier ID
resolves through `getMessierById`; and `findTourTime` is non-null from **both 25°N and 49°N**
(the contiguous-US extremes). This test is what makes "add a tour = add a file" safe.

### Seam 3: camera direction (pure, new)

Interpolation of direction (shortest arc) and FOV over normalised time, the target direction and
FOV for each stop kind, and the reduced-motion path (instant).

### Seam 4: the player (component, new)

With the canvas stubbed and a fake clock: Next/Back/keyboard move between stops; the scrubber is
disabled and shows the tour time; Exit offers restore vs stay, and restore returns the previous
virtual time and play mode; the observer is untouched throughout; an unknown `?tour=` does
nothing; the popup opens for star/Messier stops.

### Prior art

`lib/time-controller` reducer tests (pure, fixed clock); the lessons content test (every file is
a real slug); the `/?star=` deep-link handling in `app/page.tsx`.

### Not tested, by design

Visual quality of the move, the highlight ring's look, and 60 fps during transitions. These are
checked by eye on a preview deploy.

## Out of Scope

- "Tonight's tour" (generated from what's up, includes planets and the Moon).
- User-controlled zoom anywhere in the app.
- Timed or autoplay tours.
- Saving tour completion, or marking stops viewed/read.
- A `/tours` index page.
- Narrated audio.
- Tours authored in the database or edited through an admin UI.

## Further Notes

### Sequencing

Tickets 1 and 2 are independent and can start immediately. Ticket 3 needs both. Ticket 4 needs
3. Ticket 5 (content) needs only 1, so commentary review can run alongside the UI work.

### Future: "Tonight's tour"

The player takes a `Tour`, and a generated tour is just a `Tour` built at runtime. Generating
one would use the "What's up tonight" visible-objects function as the stop list, include
planets and the Moon, and pin the tour time to tonight. The "evening by Sun altitude" definition
above may also help resolve that spec's open timezone question.
