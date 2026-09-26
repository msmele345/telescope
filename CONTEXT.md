# Telescope — Context

Shared vocabulary and standing decisions that don't belong to any single spec. Specs live in
`plans/`, tickets in `issues/`.

## Glossary

- **Lesson** — the authored MDX page for a constellation (sections: an epithet heading,
  Mythology or History, Notable stars, How to find it). A constellation *has a lesson* when its
  MDX file exists in the constellation content folder.
- **Draft lesson** — a lesson produced by the lesson-drafting script. It is an ordinary lesson
  file once merged; the review PR is the only record that it began as a draft.
- **Fact sheet** — the catalog-derived facts for one constellation (brightest stars, Messier
  objects, season, hemisphere) that a draft is grounded in and checked against.
- **Observer** — the viewer's location (lat/lng, optionally zip/city/state), saved in the
  browser and, for signed-in users, in user settings.
- **Virtual time** — the time the sky map is currently showing, driven by the time controller.
  It is not necessarily the wall-clock time.

## Future considerations

Planned during the v2 AI-features session (2026-09-25) and **deliberately deferred**. Each
needs its own spec before work starts.

### "Ask the sky" in the star popup

A signed-in user asks about the star they clicked (or its constellation — constellations are
not themselves clickable on the canvas) and gets a streamed answer. The prompt would carry the
star's catalog data, the observer, the virtual time, and the constellation's lesson text when
one exists.

Deferred on cost. Decisions reached so far:

- Signed-in only. The auth spec declined per-IP throttling, so an anonymous endpoint would be
  an unbounded metered one.
- Needs a per-user daily cap (~20), a global daily ceiling (~500), a Console spend limit, and
  an answer-length cap.
- Rough per-question cost (≈1.5K in / ≈500 out tokens): Opus 5 ≈ $0.02, Sonnet 5 ≈ $0.008,
  Haiku 4.5 ≈ $0.004. At 100 users × 3 questions/day: ≈ $180 / $72 / $36 per month.
- Open: model choice; whether the button also belongs on planet and Messier popups.
- `StarPopup` receives only the star today — observer and virtual time would need threading
  from the home page.

### "What's up tonight" summary

A short, plain-language list of what's worth looking for tonight, written from the objects
above the horizon for the observer's location.

Decisions reached so far:

- Open to anonymous visitors (it is the best hook for them).
- Cost bounded by caching one summary per rounded location (~1° lat/lng cell) per local night,
  not per visit. ≈ $0.02 per summary on Opus 5; ≈ $30/month at 50 distinct cells a night.
- The list of visible objects is computed deterministically and tested as a pure function; the
  model only writes prose from it and never decides what is up.
- Open: the definition of "tonight". The zipcode data carries no timezone, so a local night
  needs a timezone source (or a longitude-derived approximation) before this can be specified.
