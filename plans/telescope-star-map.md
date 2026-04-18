# Plan: Telescope — Interactive Star Map

> Source PRD: `./PRD.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Stack**: Next.js (App Router) + React, deployed on Vercel. Vercel Postgres for persistence. Vitest for tests.
- **Rendering**: react-three-fiber + three.js for the celestial-sphere scene; `astronomy-engine` for Sun/Moon/planet positions.
- **Auth**: NextAuth (Auth.js) with Google OAuth + email magic link. Anonymous browsing allowed; auth required for favorites, viewed/read tracking, profile.
- **Routes**:
  - `/` — interactive sky map (public)
  - `/constellations/[slug]` — per-constellation mythology/lesson page (public)
  - `/profile` — user history (auth required)
  - `/login` — auth entry
  - `/api/auth/*` — NextAuth handlers
- **Schema** (Postgres):
  - `User` (id, email, name, image, created_at)
  - `UserSettings` (user_id, zipcode, lat, lng)
  - `Favorite` (user_id, target_type: 'star' | 'constellation', target_id, created_at)
  - `ViewedConstellation` (user_id, constellation_id, viewed_at)
  - `ReadLesson` (user_id, constellation_id, read_at)
- **Static data (bundled at build)**: Yale Bright Star Catalog (~9k stars), 88 IAU constellation line definitions, US zipcode → lat/lng dataset, Messier deep-sky subset.
- **Deep modules** (pure, framework-agnostic, unit-tested): `sky-math`, `star-catalog`, `zip-geocoder`, `time-controller`.
- **Anonymous persistence**: zipcode and last-used time stored in `localStorage`; promoted to `UserSettings` on login.
- **Content**: MDX files for constellation lessons. Starter set authored at launch; remaining constellations show "coming soon."

---

## Phase 1: Scaffold + "Hello Sky"

**User stories**: foundational (none directly)

### What to build

Stand up the Next.js App Router project, configure Vitest, provision Vercel Postgres (no tables yet), and deploy to Vercel. The home route renders an r3f canvas with a single hardcoded star to prove the full pipeline — local dev, build, deploy, and 3D rendering — is wired end-to-end.

### Acceptance criteria

- [ ] `pnpm dev` runs the app locally with the canvas visible.
- [ ] `pnpm test` runs Vitest with at least one passing smoke test.
- [ ] The app is deployed to a Vercel preview URL and loads successfully.
- [ ] Vercel Postgres is provisioned and connection string is configured.
- [ ] A single star is visibly rendered via react-three-fiber.

---

## Phase 2: Default-location sky with full catalog

**User stories**: 1, 4

### What to build

Bundle the Yale Bright Star Catalog as static JSON and render all ~9,000 stars on the inside of a celestial sphere from a default observer location (geographic center of the contiguous US) at the current time. The user can drag to pan around the sky. No location prompt, no time controls, no interactivity beyond panning. Stars are sized/brightened by magnitude.

### Acceptance criteria

- [ ] Yale Bright Star Catalog is bundled and loaded via the `star-catalog` module.
- [ ] All catalog stars are visible on the celestial sphere.
- [ ] Star apparent size/brightness reflects magnitude.
- [ ] Drag-to-pan camera controls work smoothly at 60fps on a mid-tier laptop.
- [ ] Initial render uses the default US-center location and current UTC.

---

## Phase 3: Zipcode-driven sky math

**User stories**: 2, 3

### What to build

Build the `sky-math` and `zip-geocoder` deep modules with full unit-test coverage. Add a non-intrusive "Set your location" banner and a zipcode entry modal. Once a zipcode is entered, the sky reflects the observer's actual latitude/longitude. Add a horizon plane and N/E/S/W compass markers so users can orient themselves. Persist the zipcode in `localStorage` for anonymous users.

### Acceptance criteria

- [ ] `sky-math` converts (observer lat/lng, UTC time, RA/Dec) → alt/az with verifiable accuracy against known fixtures.
- [ ] `zip-geocoder` resolves valid US zipcodes to lat/lng and returns null for invalid input.
- [ ] Both modules have Vitest unit tests covering edge cases.
- [ ] Location banner appears on first visit; modal accepts zipcode and validates it.
- [ ] Sky updates to reflect the entered location.
- [ ] Horizon plane and compass markers are visible and correctly oriented.
- [ ] Zipcode persists across reloads via `localStorage`.

---

## Phase 4: Time scrubbing

**User stories**: 10, 11, 12

### What to build

Build the `time-controller` state machine (framework-agnostic, fully unit-tested). Add the TimeScrubber UI: a timeline at the bottom of the screen with play/pause, speed controls (1x, 60x, 3600x), a date-time picker, and a "now" reset. The sky updates as time scrubs. Default state is "now."

### Acceptance criteria

- [ ] `time-controller` has tested state transitions (play, pause, speed change, scrub, reset).
- [ ] TimeScrubber UI exposes play/pause, speed selector, date-time picker, and "now" button.
- [ ] Component test covers user interactions emitting correct controller events.
- [ ] Sky positions update in response to time changes.
- [ ] Defaults to current UTC on load.

---

## Phase 5: Constellation lines + star popups

**User stories**: 5, 7

### What to build

Render constellation line art for all 88 IAU constellations on the celestial sphere. Make stars clickable: clicking opens a popup showing name, magnitude, distance, and basic facts. The popup includes a link to `/constellations/[slug]` (a stub page is acceptable; full content lands in Phase 8). Popup is keyboard-dismissable.

### Acceptance criteria

- [ ] All 88 constellation line patterns render correctly.
- [ ] Clicking a star (including Bayer designation hit-test on small targets) opens a popup.
- [ ] Popup displays name, magnitude, distance, constellation membership.
- [ ] Popup links to the parent constellation page.
- [ ] Popup is dismissable via Escape key and click-outside.
- [ ] Component test covers popup rendering and interaction.

---

## Phase 6: Planets, Sun, Moon, deep-sky objects

**User stories**: 8, 9

### What to build

Integrate `astronomy-engine` to compute and render the Sun, Moon, and 8 planets at their correct positions, time-scrub aware. Bundle a Messier-catalog subset for deep-sky objects (nebulae, galaxies, clusters) and render them on the sphere with appropriate visual treatment. Each is clickable with its own popup.

### Acceptance criteria

- [ ] Sun, Moon, and 8 planets render in correct positions for a given observer/time.
- [ ] Positions update when time scrubs.
- [ ] Messier subset is bundled and rendered with visually distinct styling.
- [ ] Planets, Moon, Sun, and DSOs are clickable and show popups.
- [ ] Position calculations are recomputed per time tick, not per frame.

---

## Phase 7: Auth (Google + magic link)

**User stories**: 15, 16

### What to build

Integrate NextAuth with Google OAuth and email magic link providers. Create the `User` and `UserSettings` tables. Build a login page and surface sign-in/out in the global header. Map and constellation routes remain fully public. On login, anonymous `localStorage` zipcode is promoted to `UserSettings`.

### Acceptance criteria

- [ ] User can sign in with Google.
- [ ] User can sign in with email magic link.
- [ ] `User` row is created on first sign-in.
- [ ] Map and constellation pages remain accessible without auth.
- [ ] `UserSettings` is populated from `localStorage` zipcode on first login.
- [ ] Header reflects auth state (sign in / profile + sign out).

---

## Phase 8: Constellation pages + starter mythology content

**User stories**: 6, 13, 14

### What to build

Implement `/constellations/[slug]` rendering MDX content. Author the starter content set: 12 zodiac constellations + Orion + Ursa Major + Ursa Minor. All 88 constellation slugs resolve; un-authored ones render a "coming soon" page that still shows the constellation's name, member stars, and sky position. The star popup link from Phase 5 now lands on real content.

### Acceptance criteria

- [ ] `/constellations/[slug]` renders MDX for authored constellations.
- [ ] Starter set (15 constellations) has authored mythology + lesson content.
- [ ] Un-authored constellations render a "coming soon" page with stub info.
- [ ] Star-popup links resolve correctly.
- [ ] Component test covers authored vs. un-authored rendering paths.

---

## Phase 9: Favorites + mark viewed/read

**User stories**: 17, 18, 19, 20

### What to build

Create `Favorite`, `ViewedConstellation`, and `ReadLesson` tables. Add server actions for save/unsave and mark/unmark. Surface UI affordances: a favorite (star) button on the star popup; favorite + "mark viewed" buttons on constellation pages; a "mark as read" button on lesson content. All affordances are gated on auth — unauthenticated users see a sign-in prompt.

### Acceptance criteria

- [ ] Authenticated users can favorite/unfavorite stars and constellations.
- [ ] Authenticated users can mark/unmark constellations as viewed.
- [ ] Authenticated users can mark/unmark lessons as read.
- [ ] Unauthenticated users see a sign-in prompt instead of mutation buttons.
- [ ] Server actions enforce auth on the server side.
- [ ] State persists across reloads.

---

## Phase 10: Profile page

**User stories**: 21

### What to build

Build `/profile` for signed-in users. Display three sections: favorites (stars + constellations), viewed constellations, and read lessons. Each entry links back to its source (star → opens map with star focused; constellation → constellation page). Empty states for each section.

### Acceptance criteria

- [ ] `/profile` requires auth and redirects unauthenticated users to login.
- [ ] Favorites section lists favorited stars and constellations with links.
- [ ] Viewed constellations section lists with timestamps.
- [ ] Read lessons section lists with timestamps.
- [ ] Each section has a friendly empty state.

---

## Phase 11: Accessibility list + visual polish

**User stories**: 22, 23, 24

### What to build

Ship the parallel DOM-based searchable list of stars and constellations as the accessibility path — full keyboard navigation, screen-reader friendly, opens the same popups/links as the canvas. Apply the visual polish that makes the experience "stunning": subtle Milky Way backdrop, star twinkle shader, smooth micro-interactions, refined typography, tablet breakpoint. Performance pass to confirm the 60fps / <500kb gzipped-JS budgets.

### Acceptance criteria

- [ ] Searchable star/constellation list is reachable from anywhere via keyboard.
- [ ] List entries open the same star/constellation detail flows as the canvas.
- [ ] Screen reader can announce list contents and detail content.
- [ ] Milky Way backdrop and twinkle shader are visible and performant.
- [ ] App is usable on tablet (portrait + landscape).
- [ ] Initial JS bundle is under 500kb gzipped.
- [ ] Sustained 60fps on a mid-tier laptop with all 9k stars + planets + DSOs visible.
