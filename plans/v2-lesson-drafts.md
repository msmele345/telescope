# Spec: Telescope v2 — Draft the Missing Constellation Lessons

> Status: ready for implementation.
> Planned alongside two AI features ("Ask the sky", "What's up tonight") that were deferred —
> see *Future considerations* in `CONTEXT.md`.

## Problem Statement

Telescope covers all 88 IAU constellations, but only 15 of them have a lesson. A visitor who
clicks through to any of the other 73 — Andromeda, Cassiopeia, Cygnus, Lyra, most of the
southern sky — lands on a page that says little more than "coming soon" and a member-star list.
The site's promise, that any constellation you find in the sky has a story and a way to find it,
holds for fewer than one in five of them.

Writing the remaining 73 by hand at the quality of the first 15 is weeks of work. Meanwhile, the
facts a lesson needs — the brightest stars, their names, magnitudes and distances, the Messier
objects, when and where the constellation is visible — already sit in the repository's own
catalogs.

There is also a structural obstacle: a lesson only appears if it is registered by hand in two
separate lists, and a test pins the count at exactly fifteen. Adding lessons in bulk means
editing source code in lockstep with content, which is exactly the drift such lists invite.

## Solution

A one-off script drafts all 73 missing lessons in a single run, through the Message Batches API
at half the normal price (roughly $2 for the whole set). Each draft is grounded in a fact sheet
built from Telescope's own star and Messier catalogs and styled after the handwritten lessons.
Every draft is machine-checked for structure and for invented facts before it reaches a human,
and then reviewed in ordinary pull requests — seven of them, ten or eleven lessons each — before
any visitor sees it.

Beforehand, lessons become discoverable from the content folder itself, so that adding a lesson
means adding one file and nothing else. The draft PRs are therefore pure content.

## User Stories

### Visitors

1. As a visitor, I want every constellation page to have a lesson, so that clicking through from
   the sky map is always worth it.
2. As a visitor, I want the new lessons to read like the existing ones, so that the site feels
   like one coherent guide rather than two different sources.
3. As a visitor, I want every lesson to follow the same sections, so that I know where to look
   for the story, the notable stars, and how to find it.
4. As a visitor, I want the numbers in a lesson — distances, magnitudes — to be accurate, so
   that I can trust what I read.
5. As a visitor, I want the star names in a lesson to match what I see in the star popup, so
   that I can connect the lesson to the map.
6. As a visitor, I want to learn which Messier objects lie in a constellation, so that I know
   what else is worth pointing a telescope at there.
7. As a visitor, I want to know which season and hemisphere favour a constellation, so that I
   know whether I can see it at all.
8. As a visitor looking at a constellation with no classical mythology, I want to be told
   honestly where its name came from, rather than being handed an invented myth.
9. As a signed-in user, I want to mark the new lessons as read, exactly as I can the existing
   ones, so that my reading history covers the whole sky.
10. As a visitor, I want the page description shown in search results and link previews to say
    the constellation has a lesson once it does, so that the listing is not stale.

### Maintainer — lesson discovery

11. As a maintainer, I want a constellation to have a lesson exactly when its lesson file
    exists, so that there is one source of truth.
12. As a maintainer, I want adding a lesson to require adding one file and nothing else, so that
    I cannot forget a registration step.
13. As a maintainer, I want the change to lesson discovery to alter nothing a visitor sees for
    the existing 15 lessons, so that the prefactor is safe to ship on its own.

### Maintainer — drafting

14. As a maintainer, I want to generate all missing drafts with one command, so that the work
    is a single sitting rather than 73.
15. As a maintainer, I want drafting to run at batch pricing, so that the whole set costs a few
    dollars.
16. As a maintainer, I want a dry run that shows what would be sent and roughly what it would
    cost, without spending anything, so that I can check the requests before paying.
17. As a maintainer, I want the script never to overwrite an existing lesson, so that the 15
    handwritten lessons and any draft I have already edited are safe.
18. As a maintainer, I want to redraft a single constellation on demand, so that one rejected
    draft does not mean rerunning everything.
19. As a maintainer, I want an interrupted run to resume the batch it already submitted, so that
    I never pay twice for the same drafts.
20. As a maintainer, I want drafts that errored or expired to be listed at the end of a run, so
    that a rerun retries only those.
21. As a maintainer, I want the script kept out of the build and the deploy, so that no deploy
    ever spends money or rewrites reviewed content.
22. As a maintainer, I want the API key to live only on my machine, so that the deployed app
    never holds a credential it has no use for.
23. As a maintainer, I want to use a dedicated key with a small spend limit and revoke it
    afterwards, so that a leaked or forgotten key has a bounded blast radius.

### Maintainer — grounding and review

24. As a maintainer, I want each draft grounded in a fact sheet built from the repository's own
    catalogs, so that facts come from data rather than the model's memory.
25. As a maintainer, I want the fact sheet to be the only permitted source of numbers, so that
    invented distances and magnitudes are both discouraged and detectable.
26. As a maintainer, I want the drafts styled after a varied handful of handwritten lessons, so
    that tone and length match without every draft copying one lesson.
27. As a maintainer, I want structurally broken drafts rejected before they are written, so that
    I never review a lesson missing a section or carrying frontmatter.
28. As a maintainer, I want drafts that mention a distance, magnitude, star name or Messier id
    not found in the fact sheet to be flagged, so that I know exactly where to look.
29. As a maintainer, I want a review report listing each draft and its flags, so that reviewers
    start with the riskiest lessons.
30. As a reviewer, I want the drafts split into seven PRs of ten or eleven lessons, so that each
    one gets a genuine read rather than a skim.
31. As a reviewer, I want each PR to carry its own slice of the review report, so that I review
    against the flags for exactly the lessons in front of me.
32. As a maintainer, I want the review PRs to be independent of each other, so that lessons go
    live as each PR merges rather than all at once.
33. As a maintainer, I want no draft marker left inside merged lessons, so that there is nothing
    to remember to remove.

## Implementation Decisions

### Scope

This spec covers lesson discovery and lesson drafting only. "Ask the sky" and "What's up
tonight" were planned in the same session and deferred; their decisions so far are recorded in
`CONTEXT.md`.

### Lesson discovery (prefactor)

Today a lesson is reachable only if it is listed in two hand-maintained registries — a pure list
of authored slugs, and a static map of MDX imports — and a test pins the count at fifteen.

Both registries are removed in favour of the content folder as the single source of truth:

- A single lesson resolver loads a constellation's lesson with a dynamic import of its MDX
  file, resolved by slug. The bundler compiles every file in that folder ahead of time; a failed
  import resolves to "no lesson".
- "Does this constellation have a lesson?" is answered by that same resolver — both the page body
  and the page metadata ask it. **It must not check the filesystem at runtime.** On Vercel, the
  MDX files are compiled into the bundle as modules and are not shipped as raw files, so a
  file-existence check passes locally, in tests and in `next build`, then reports "no lesson"
  for every constellation in the deployed app. The resolver is the only source of truth at
  runtime; the filesystem is the source of truth only for the drafting script and for tests.
- The page's observable behaviour is unchanged for all 88 constellations. This ships on its own,
  before any drafts exist, and is verified on a Vercel preview deploy, not only locally.

Rejected alternatives: having the drafting script also rewrite both registries (a script editing
source code, with the two lists still free to drift), and generating a single registry file
(codegen that must be committed alongside the content).

### The lesson format

The drafts follow the handwritten lessons exactly: plain MDX with **no frontmatter**, roughly 35
lines, and four `##` sections in order:

1. An epithet heading (e.g. "The Hunter") with a short introduction.
2. **Mythology** — or **History** for constellations with no classical mythology.
3. **Notable stars**.
4. **How to find it**.

The Mythology/History split follows a fixed rule rather than the model's judgement: the 48
classical (Ptolemaic) constellations — which correspond to **50** of today's IAU names, because
Argo Navis became Carina, Puppis and Vela — get Mythology. The list is data in the lesson-draft
module with an asserted count of 50. Crux and Coma Berenices, despite their old stars, are *not*
Ptolemaic. The modern ones (largely 16th–18th-century southern and filler
constellations, many named for instruments) get History. The History section says plainly where
the name came from and who introduced it, and does not invent a myth.

### Fact sheet

A pure function builds the fact sheet for one constellation from the constellation metadata, the
star catalog, and the Messier catalog:

- Name, genitive, abbreviation, and whether it takes a Mythology or History section.
- The brightest five to eight member stars, each with proper name (when it has one), Bayer
  designation, magnitude, distance, and colour temperature.
- Every Messier object in the constellation, with id, common name, type, and magnitude.
- The best season and the favoured hemisphere, derived from the constellation's central
  position. No centroid helper exists today; the centre is the mean position of its member
  stars (averaging right ascension circularly, so constellations straddling 0h come out right).

It must handle constellations with no named stars and constellations with no Messier objects.

### Request

A pure function builds one batch request from a fact sheet and a fixed set of style examples:

- The model is **Claude Opus 5**, with adaptive thinking. At roughly $0.026 a lesson at batch
  pricing, there is no reason to trade quality for cost.
- Effort is set explicitly to **medium**. Opus 5 defaults to high, and at high effort a prose
  task can spend several thousand thinking tokens, which would push the run towards its
  ceiling for no visible gain on a 35-line lesson.
- Style examples are three handwritten lessons chosen for variety: **Orion** (famous, rich
  mythology), **Ursa Minor** (northern, circumpolar), and **Libra** (faint, modest).
- Instructions: reproduce the four-section format, no frontmatter, about 35 lines, use **only**
  numbers present in the fact sheet, and use a History section where the fact sheet says so.
- The shared prefix (instructions and examples) is identical across all requests.
- Each request's custom id is the constellation slug, so results are matched by id rather than
  by position.

### Draft checks

A pure function checks a finished draft against its fact sheet and returns a verdict with a list
of flags.

- **Structure — rejects the draft:** frontmatter present; a required section missing or out of
  order; the wrong second-section heading for the constellation; length far outside the
  handwritten range (roughly 20–60 lines). A rejected draft is not written to disk and appears
  in the retry list.
- **Facts — flags the draft, does not reject it:** a distance or magnitude that does not match a
  fact-sheet value within display rounding; a proper star name not in the fact sheet; a Messier
  id not in the fact sheet.

Every handwritten lesson must pass cleanly against its own fact sheet. This is the calibration
check on the rules themselves: if a rule flags the lessons written by hand, the rule is wrong.
The one exception is a genuine disagreement between a handwritten lesson and the catalog (a
distance quoted from a different source, say). The handwritten lessons are not edited by the
script, but they can be corrected by hand in the implementing PR, and the PR should say which
source won.

### The drafting script

A manual npm script, alongside the existing data-fetch scripts. **Never part of the build or the
deploy.**

- Drafts every constellation that has no lesson file. It never overwrites an existing file.
- An `--only <slug>` option redrafts one constellation (after its file has been deleted).
- A `--dry-run` option builds and prints the requests and an estimated token count, then exits
  without calling the API. The estimate covers input only, and says so: thinking and output
  tokens are unknown until the model runs.
- Submits one batch, records the batch id in a small gitignored state file, and polls until the
  batch ends. Rerunning while a batch is outstanding resumes that batch instead of submitting a
  new one.
- For each result: checks it, writes it if structure passes, and records its flags. Errored,
  expired and structurally rejected results are listed at the end for a retry run.
- Writes a markdown **review report**: one entry per written draft, with its flags, sorted so
  flagged drafts come first. The report is not committed; slices of it go into PR descriptions.

**Dependency:** the Anthropic TypeScript SDK, added as a dev dependency — the app itself makes
no model calls.

**Credential:** `ANTHROPIC_API_KEY` is read from `.env.local` only and is never added to any
Vercel environment. The operator creates a dedicated key for this run with a small spend limit
in the Anthropic Console, and revokes it once the drafts are merged.

**Expected cost:** about 3K input and 1.5K output tokens per lesson (including thinking), which
comes to about $0.026 each and **about $2 for all 73** at batch pricing. Retries included, it
should stay under $5.

### Review

The single run's output is split into **seven review PRs of ten or eleven lessons each**, grouped
alphabetically. Each PR:

- contains only the lesson files for its group, with no code changes;
- carries that group's slice of the review report in its description;
- is independent of the other six, so each group goes live when its PR merges.

Reviewers correct drafts in the PR like any other content. Merged drafts carry no marker.

## Testing Decisions

### What makes a good test here

Tests assert what a reviewer or visitor would notice — "a draft that invents a distance is
flagged", "a constellation without a lesson file shows no lesson" — not how a value was
computed. The repository's existing convention holds: pure logic is tested thoroughly, and
anything that does I/O is not tested at all.

### Seam 1 — the pure lesson-draft module (new)

It lives with the other pure script helpers and is tested the same way they are.

- **Fact sheet:** selects the brightest members in magnitude order; includes every Messier
  object in the constellation and none from neighbours; derives season and hemisphere correctly
  for a northern, a southern and an equatorial constellation; handles a constellation with no
  named stars and one with no Messier objects; marks a modern constellation for History and a
  classical one for Mythology, including the three Argo Navis constellations.
- **Request:** the fact sheet and all three style examples reach the request; the constellation's
  own name appears in it; the custom id is the slug; the shared prefix is byte-identical across
  two different constellations.
- **Draft checks:** frontmatter, a missing section, sections out of order, the wrong
  Mythology/History heading, and a wildly wrong length each reject the draft. An invented
  distance, an invented magnitude, an unknown star name and an unknown Messier id each raise a
  flag. A value rounded the way the handwritten lessons round (e.g. "about 860 light-years") is
  not flagged. **Every one of the 15 handwritten lessons passes cleanly against its own fact
  sheet.**

### Seam 2 — lesson discovery (existing test file, rewritten)

The lessons test changes from "exactly these fifteen" to:

- every lesson file in the content folder is named for a real constellation slug (read with the
  filesystem, which is fine in tests — the runtime never does this);
- the resolver reports a lesson for a slug whose import succeeds, and none for a slug whose
  import fails or that is not a constellation at all.

The test runner has no MDX loader — the reason the old pure slug list existed — so the resolver
is tested with the MDX import mocked at the boundary, the way component tests stub the auth
module. Whether real MDX compiles and renders is verified by `next build` and by the preview
deploy, not by the unit suite.

### Prior art

- The pure script helpers and their tests (the database guardrail and the star-distance
  resolver): pure functions exported from a script library with type declarations, tested
  without touching the network or the database.
- The auth policy tests and the time-controller reducer tests: one assertion per behaviour,
  fixed inputs, no clock.

### Not tested, by design

Batch submission, polling, the state file, and writing drafts to disk. They are plumbing for a
command that runs once, and the dry run is how they are checked by hand. The draft content
itself is verified by human review, not by automated tests.

## Out of Scope

- **"Ask the sky" and "What's up tonight".** Deferred on cost; see `CONTEXT.md`.
- **Rewriting or re-styling the 15 handwritten lessons.** They are the style reference and are
  never touched by the script.
- **Running drafting in CI, the build, or on a schedule.** A one-off manual run.
- **Any model call from the deployed app.** No key in Vercel, no runtime dependency.
- **Illustrations, star charts or other media in lessons.**
- **Frontmatter or lesson metadata.** The format stays as it is.
- **Translations.**
- **Automated fact-checking beyond the fact sheet.** Mythology and history prose is checked by
  the human reviewer, not by the script.

## Further Notes

### Sequencing

Lesson discovery ships first and on its own; it is a pure refactor with no visible change. The
pure lesson-draft module can be built in parallel, since it depends on nothing but the catalogs.
The script needs both. The seven review PRs follow a single real run of the script and are
independent of each other.

### Operator steps

Creating the dedicated API key with its spend limit, running the script, and revoking the key
afterwards are operator actions rather than implementation tasks — the same split the auth spec
made for provisioning Resend.

### Why "about 35 lines" is a range, not a rule

The handwritten lessons run from 33 to 42 lines. A modern constellation with no myth and three
faint stars honestly deserves a shorter lesson than Orion, so the structural check allows a wide
band and leaves tone and depth to review.
