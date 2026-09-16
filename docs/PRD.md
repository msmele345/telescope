# PRD: Telescope — Interactive Star Map for Astronomy Students

## Problem Statement

I love learning about astronomy, but I don't have an intuitive way to connect the names, myths, and science of the night sky to what I'd actually see when I step outside tonight. Textbook sky charts are static, planetarium software is heavy and intimidating, and phone apps assume I already know what I'm looking at. I want something beautiful and immersive on the web that meets me where I am — my town, tonight — and lets me poke around to learn.

## Solution

Telescope is a visually stunning web app that shows an immersive 3D rendering of the night sky as it would appear from the user's US zipcode. Users can drag to look around, scrub time forward and backward to see how the sky changes, click stars to learn about them, and follow links into per-constellation mythology lessons. Auth is optional for browsing; logging in unlocks favorites, a profile showing which constellations they've viewed and which lessons they've read, and the ability to mark lessons as read.

## User Stories

1. As a student, I want to see the night sky the moment I load the site, so that I'm hooked by the visual before anything else.
2. As a student, I want to enter my US zipcode, so that the star map reflects my actual local sky.
3. As a student, I want to see a ground plane, horizon line, and compass directions (N/E/S/W), so that I can orient myself relative to the real world.
4. As a student, I want to drag to pan around the sky dome, so that I can explore in every direction.
5. As a student, I want to click on a star, so that a popup shows me its name, magnitude, distance, and basic facts.
6. As a student, I want the star popup to include a link to its parent constellation, so that I can jump into mythology and lessons.
7. As a student, I want to see constellation line art connecting stars, so that I can recognize shapes like Orion and the Big Dipper.
8. As a student, I want planets, the Moon, and the Sun rendered in their correct positions, so that my view matches reality.
9. As a student, I want to see deep-sky objects like nebulae, so that I understand the sky is more than just points of light.
10. As a student, I want a time scrubber with play/pause and speed controls (1x, 60x, 3600x), so that I can watch the sky rotate and understand Earth's motion.
11. As a student, I want the time scrubber to default to "now," so that the experience is immediately relevant.
12. As a student, I want to pick a specific date and time, so that I can plan what I'll see tonight or on a future night.
13. As a student, I want to read mythology and lesson content for each constellation, so that the sky becomes a story, not just data.
14. As a student, I want to see which constellations have lessons authored vs. "coming soon," so that I know what's available.
15. As a visitor, I want to use the map without signing up, so that I can evaluate the tool before committing.
16. As a user, I want to sign in with Google or an email magic link, so that I can use the auth method I prefer.
17. As a signed-in user, I want to favorite stars, so that I can build a personal list of the ones I find interesting.
18. As a signed-in user, I want to favorite constellations, so that I can track the ones I want to revisit.
19. As a signed-in user, I want to mark a constellation as "viewed," so that my profile reflects my exploration.
20. As a signed-in user, I want to mark a lesson as "read," so that my profile reflects what I've studied.
21. As a signed-in user, I want a profile page showing my favorites, viewed constellations, and read lessons, so that I can see my history at a glance.
22. As a user on a low-powered device, I want reasonable performance, so that the experience isn't a stuttery slideshow.
23. As a user with accessibility needs, I want a searchable list of stars and constellations as an alternative to the 3D canvas, so that I'm not excluded.
24. As a student, I want the experience to work on desktop and reasonably on tablet, so that I can use whatever device is handy.

## Implementation Decisions

### Stack
- Next.js (App Router) + React, deployed on Vercel.
- Postgres (Vercel Postgres) for user data.
- NextAuth (Auth.js) with Google OAuth + email magic link providers.
- react-three-fiber + three.js for the 3D celestial sphere.
- `astronomy-engine` (MIT, pure JS) for Sun/Moon/planet positions.
- Vitest for unit and component tests.
- MDX for mythology/lesson content.

### Rendering approach
- react-three-fiber scene with the camera at the origin and stars placed on the inside of a celestial sphere.
- User drags to pan (orbit-style controls constrained so camera stays at center).
- Subtle Milky Way background, horizon plane with compass markers, twinkling stars via shader.
- Parallel DOM-based searchable list of stars/constellations for accessibility.

### Data
- Yale Bright Star Catalog (~9,000 stars, public domain) bundled as static JSON at build time.
- 88 IAU constellations with line-connection data bundled similarly.
- US zipcode → lat/lng dataset bundled as static JSON (~3MB).
- Deep-sky object subset (Messier catalog or similar) bundled.
- Planet/Sun/Moon positions computed at runtime from `astronomy-engine`.

### Modules
- **`sky-math`** — deep, pure module. Given `(observerLatLng, utcTime)`, returns altitude/azimuth for every catalog object and Sun/Moon/planets. Encapsulates RA/Dec → Alt/Az conversion, sidereal time, precession.
- **`star-catalog`** — loads Yale Bright Star Catalog + constellation lines. Exposes `getStar(id)`, `getByConstellation(name)`, `search(query)`.
- **`zip-geocoder`** — `zipToLatLng(zip)` wrapping the bundled US zipcode dataset.
- **`time-controller`** — framework-agnostic state machine for current UTC, play/pause, speed multiplier.
- **`<SkyCanvas>`** — react-three-fiber scene, consumes `sky-math` output.
- **`<TimeScrubber>`**, **`<StarPopup>`**, **`<LocationPrompt>`**, **`<ConstellationPage>`** — UI.
- **`user-data`** — server-side persistence for User, Favorite (star or constellation), ViewedConstellation, ReadLesson. Server actions for all mutations.
- **Auth layer** — NextAuth routes + middleware. Public: map, constellation pages. Protected: profile, favoriting, marking viewed/read.
- **`mythology-content`** — MDX files, one per constellation in the starter set. Remaining constellations show a "coming soon" state.

### First-visit flow
- Map renders immediately using a default US-center location (geographic center of contiguous US).
- Non-intrusive banner prompts "Set your location" → opens zipcode modal.
- Zipcode is persisted in `localStorage` for anonymous users; persisted to DB for signed-in users.

### Data model (logical)
- `User` (id, email, name, image, created_at)
- `Favorite` (user_id, target_type: 'star' | 'constellation', target_id, created_at)
- `ViewedConstellation` (user_id, constellation_id, viewed_at)
- `ReadLesson` (user_id, constellation_id, read_at)
- `UserSettings` (user_id, zipcode, lat, lng)

### Content scope
- Starter set of authored mythology/lesson MDX files: 12 zodiac constellations + Orion + Ursa Major + Ursa Minor.
- All 88 constellations are clickable; un-authored ones show "coming soon" page with stub info (name, stars, position).

## Testing Decisions

Good tests verify external behavior, not implementation details. They should survive internal refactors and fail only when user-visible behavior changes.

### Unit tests (Vitest)
- **`sky-math`** — given fixed observer/time inputs, assert known outputs. E.g., Polaris altitude from a Minneapolis zipcode on 2026-01-01 should be ~45°. Use well-known astronomical fixtures.
- **`star-catalog`** — loads expected number of stars, lookup by ID works, constellation membership is correct, search returns expected matches.
- **`zip-geocoder`** — known zipcodes resolve to expected lat/lng; invalid zipcodes return null.
- **`time-controller`** — state transitions (play → pause, speed changes, scrubbing) produce correct tick sequences.

### Component tests (Vitest + React Testing Library)
- **`<TimeScrubber>`** — user interactions (play, pause, speed toggle, date pick) emit correct events.
- **`<StarPopup>`** — renders star data and constellation link correctly; keyboard-dismissable.
- **`<LocationPrompt>`** — accepts valid zipcode, shows error on invalid, emits resolved lat/lng.
- **`<ConstellationPage>`** — renders authored content; shows "coming soon" for un-authored constellations.

### Not tested in v1
- The `<SkyCanvas>` three.js rendering itself (visual, not behavioral; tested by eye).
- End-to-end auth flows (manual verification for v1).

### Prior art
- No existing test patterns in the repo (greenfield). Vitest configs from similar Next.js app-router projects will serve as reference.

## Out of Scope

- Quiz / assessment system (deferred to a later version).
- Explicit progress tracking or gamification (profile only displays history, not progress).
- Automatic location detection via browser geolocation.
- International zipcodes / non-US locations.
- Mobile-first or native app experience (desktop + tablet are the targets).
- Live astronomy data APIs (e.g., real-time satellite positions, comet tracking).
- Social features (sharing, following, comments).
- All 88 constellations authored at launch — only starter set is in scope for v1.
- Offline / PWA support.

## Further Notes

- Accessibility: the 3D canvas is not screen-reader friendly; the parallel searchable star/constellation list is the accessibility path and must ship with v1, not be retrofitted.
- Performance budget: initial JS payload target < 500kb gzipped; maintain 60fps on a mid-tier laptop at 9k stars.
- The "wow" factor is the primary product differentiator for the student audience. UX polish (micro-interactions, transitions, typography, the Milky Way backdrop, twinkle shader) is not optional — it's the feature.
- Future versions may add: quiz system, 88 full authored constellations, night-mode (red-light) theme, observation journal, telescope recommendations by location.
