# Tickets: Telescope v2 — Draft the Missing Constellation Lessons

Make lessons discoverable from the content folder, then draft the 73 missing lessons in one
batch run grounded in Telescope's own catalogs, and review them in seven content-only PRs.
Source spec: `plans/v2-lesson-drafts.md`.

Work the **frontier**: any ticket whose blockers are all done. Tickets 1 and 2 can both start
immediately. The seven review tickets are independent of each other once ticket 4 is done.

Ticket 4 is **operator work**, not agent work: it needs a Console account, real money (≈ $2), and
judgement about splitting the output. The review tickets are human review with agent help for
edits.

---

## 1. Discover lessons from the content folder

**What to build:** A constellation has a lesson exactly when its MDX file exists in the
constellation content folder. The two hand-maintained registries — the pure list of authored
slugs and the static map of MDX imports — are deleted. A single lesson resolver loads a lesson
by slug through a dynamic import; a failed import means "no lesson". Both the page body and the
page metadata ask that resolver. Nothing a visitor sees changes for any of the 88
constellations. This is the prefactor that makes every later draft PR pure content.

**Do not check the filesystem at runtime.** On Vercel the MDX files are compiled into the bundle
and are not shipped as raw files, so a file-existence check passes locally, in tests and in
`next build`, then reports "no lesson" for every constellation once deployed. That is why a
preview deploy is part of the acceptance criteria below.

The test runner has no MDX loader, so the resolver is tested with the MDX import mocked at the
boundary, the way component tests stub the auth module.

**Blocked by:** None — can start immediately.

- [ ] The two lesson registries are gone; adding a lesson requires adding one file and nothing else.
- [ ] No runtime code path reads the content folder from disk.
- [ ] The 15 existing lessons render exactly as before, including page metadata and the mark-read control.
- [ ] A constellation with no lesson file still shows the member-star fallback and the "coming soon" description.
- [ ] Lessons test: every file in the content folder is named for a real constellation slug.
- [ ] Resolver test (MDX import mocked): a slug whose import succeeds has a lesson; one whose import fails, and a non-constellation slug, do not.
- [ ] The full existing test suite passes; `next build` succeeds.
- [ ] **Verified on a Vercel preview deploy:** a constellation with a lesson (e.g. Orion) renders it with the lesson description in its metadata, and one without (e.g. Andromeda) shows the fallback.

## 2. Pure lesson-draft module

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

## 3. The drafting script

**What to build:** A manual `npm run lessons:draft` command, alongside the existing data-fetch
scripts and never part of the build or deploy. It drafts every constellation with no lesson file,
through the Message Batches API, and writes the drafts that pass the structural checks.

- Never overwrites an existing lesson file. `--only <slug>` drafts a single constellation.
- `--dry-run` builds and prints the requests and an estimated input-token count (stated as
  input only — thinking and output are unknown until the model runs), then exits without
  calling the API.
- Submits one batch, records its id in a gitignored state file, and polls until it ends.
  Rerunning while a batch is outstanding resumes it rather than submitting another.
- Matches results by custom id. Errored, expired and structurally rejected results are listed at
  the end so a rerun retries only those.
- Writes a markdown review report — one entry per written draft with its flags, flagged drafts
  first. The report is not committed.
- Reads `ANTHROPIC_API_KEY` from `.env.local` only. The Anthropic TypeScript SDK is a dev
  dependency; the app makes no model calls.

**Blocked by:** 1. Discover lessons from the content folder; 2. Pure lesson-draft module.

- [ ] `--dry-run` prints 73 requests and a token estimate and makes no API call.
- [ ] `--only <slug>` against a real key drafts one constellation end to end (a few cents), and the draft renders on its constellation page in local dev.
- [ ] Rerunning with a lesson file already present skips it; the 15 handwritten lessons are never touched.
- [ ] Interrupting and rerunning resumes the recorded batch instead of submitting a new one.
- [ ] Structurally rejected, errored and expired results are not written and are listed for retry.
- [ ] The review report lists each written draft with its flags, flagged drafts first.
- [ ] The state file and review report are gitignored; the API key appears in no Vercel environment.
- [ ] The script is not invoked by `build` or any deploy step.

## 4. Run the drafts

**What to build:** Operator work. The one real run that produces all 73 drafts, split into the
seven review branches.

1. In the Anthropic Console, create a dedicated key (e.g. `telescope-lesson-drafts`) with a small
   spend limit, and put it in `.env.local`.
2. Run the script with `--dry-run`, then for real. Rerun for any retries.
3. Split the output onto seven `feat/lessons-<group>` branches off `develop`, following the
   groups in tickets 5–11, each with its slice of the review report.
4. Revoke the key once all seven review PRs are merged.

**Blocked by:** 3. The drafting script.

- [ ] All 73 drafts written (after retries), with a review report.
- [ ] Total spend recorded, and under $5.
- [ ] Seven branches exist, each containing only its group's lesson files.
- [ ] The dedicated key is revoked after the last review PR merges.

## 5. Review lessons — group A

**What to build:** One content-only PR for 11 lessons: Andromeda, Antlia, Apus, Aquila, Ara,
Auriga, Boötes, Caelum, Camelopardalis, Canes Venatici, Canis Major. The PR description carries
this group's slice of the review report. Every flag is resolved, and every lesson is read for
accuracy and tone. Merging makes these lessons live.

**Blocked by:** 4. Run the drafts.

- [ ] Every flag in the group's report is resolved (corrected or confirmed correct).
- [ ] Each lesson has been read in full; mythology/history claims checked.
- [ ] Each lesson renders on its constellation page, and the mark-read control works.
- [ ] PR contains lesson files only.

## 6. Review lessons — group B

**What to build:** One content-only PR for 11 lessons: Canis Minor, Carina, Cassiopeia,
Centaurus, Cepheus, Cetus, Chamaeleon, Circinus, Columba, Coma Berenices, Corona Australis.
Same review bar as group A.

**Blocked by:** 4. Run the drafts.

- [ ] Every flag in the group's report is resolved (corrected or confirmed correct).
- [ ] Each lesson has been read in full; mythology/history claims checked.
- [ ] Each lesson renders on its constellation page, and the mark-read control works.
- [ ] PR contains lesson files only.

## 7. Review lessons — group C

**What to build:** One content-only PR for 11 lessons: Corona Borealis, Corvus, Crater, Crux,
Cygnus, Delphinus, Dorado, Draco, Equuleus, Eridanus, Fornax. Same review bar as group A.

**Blocked by:** 4. Run the drafts.

- [ ] Every flag in the group's report is resolved (corrected or confirmed correct).
- [ ] Each lesson has been read in full; mythology/history claims checked.
- [ ] Each lesson renders on its constellation page, and the mark-read control works.
- [ ] PR contains lesson files only.

## 8. Review lessons — group D

**What to build:** One content-only PR for 10 lessons: Grus, Hercules, Horologium, Hydra,
Hydrus, Indus, Lacerta, Leo Minor, Lepus, Lupus. Same review bar as group A.

**Blocked by:** 4. Run the drafts.

- [ ] Every flag in the group's report is resolved (corrected or confirmed correct).
- [ ] Each lesson has been read in full; mythology/history claims checked.
- [ ] Each lesson renders on its constellation page, and the mark-read control works.
- [ ] PR contains lesson files only.

## 9. Review lessons — group E

**What to build:** One content-only PR for 10 lessons: Lynx, Lyra, Mensa, Microscopium,
Monoceros, Musca, Norma, Octans, Ophiuchus, Pavo. Same review bar as group A.

**Blocked by:** 4. Run the drafts.

- [ ] Every flag in the group's report is resolved (corrected or confirmed correct).
- [ ] Each lesson has been read in full; mythology/history claims checked.
- [ ] Each lesson renders on its constellation page, and the mark-read control works.
- [ ] PR contains lesson files only.

## 10. Review lessons — group F

**What to build:** One content-only PR for 10 lessons: Pegasus, Perseus, Phoenix, Pictor,
Piscis Austrinus, Puppis, Pyxis, Reticulum, Sagitta, Sculptor. Same review bar as group A.

**Blocked by:** 4. Run the drafts.

- [ ] Every flag in the group's report is resolved (corrected or confirmed correct).
- [ ] Each lesson has been read in full; mythology/history claims checked.
- [ ] Each lesson renders on its constellation page, and the mark-read control works.
- [ ] PR contains lesson files only.

## 11. Review lessons — group G

**What to build:** One content-only PR for 10 lessons: Scutum, Serpens, Sextans, Telescopium,
Triangulum, Triangulum Australe, Tucana, Vela, Volans, Vulpecula. Same review bar as group A.

**Blocked by:** 4. Run the drafts.

- [ ] Every flag in the group's report is resolved (corrected or confirmed correct).
- [ ] Each lesson has been read in full; mythology/history claims checked.
- [ ] Each lesson renders on its constellation page, and the mark-read control works.
- [ ] PR contains lesson files only.
