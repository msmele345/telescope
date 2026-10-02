# Ticket 12: Fix the Cor Caroli star name in the catalog

> Source: follow-up from ticket 5 (`05-review-lessons-group-a.md`). Spec context:
> `plans/v2-lesson-drafts.md`, user story 5.

**The problem:** The star catalog names two different stars "Chara": β Canum Venaticorum
(HR 4785, magnitude 4.26), which really is Chara, and α² Canum Venaticorum (HR 4915, magnitude
2.90), which is **Cor Caroli**. The error is upstream: the `Common` field of the source catalog
that `scripts/fetch-bsc.mjs` downloads says "Chara" for both, and the script copies it through
unchanged into `public/data/bsc5.json`.

What a visitor sees today:

- The star popup titles the brightest star in Canes Venatici "Chara".
- Searching for "Cor Caroli" finds nothing; searching for "Chara" returns two stars.
- The Canes Venatici lesson, corrected in ticket 5, says Cor Caroli, so it now disagrees with
  the popup. User story 5: "I want the star names in a lesson to match what I see in the star
  popup."
- The lesson checker flags `"Cor Caroli" is not named in the fact sheet`, because the fact
  sheet is built from the same catalog.

**What to build:** A curated name correction applied when the catalog is built, the same way
`CURATED_DISTANCES` in `scripts/lib/star-distance.mjs` corrects distances the source gets
wrong: a small table keyed by HR number, in a pure helper beside the other script helpers,
tested without the network, and applied in `fetch-bsc.mjs` where `star.name` is set. Then
regenerate `public/data/bsc5.json` and commit it.

Do not patch `bsc5.json` by hand without also correcting the build: the next `npm run
data:fetch:bsc` would silently bring "Chara" back.

No lesson changes are needed. The Canes Venatici lesson is already right.

**Blocked by:** None — can start immediately. Independent of review tickets 6–11.

- [ ] HR 4915 (α² CVn) is named "Cor Caroli" in `public/data/bsc5.json`; HR 4785 (β CVn) is still "Chara".
- [ ] The correction lives in the build (a tested pure helper used by `fetch-bsc.mjs`), so rerunning `npm run data:fetch:bsc` keeps it.
- [ ] Test: the helper returns the curated name for a corrected HR number and the source name unchanged for every other star, including one with no name.
- [ ] The regenerated `bsc5.json` differs from the committed one only in the intended names — no positions, magnitudes or distances move.
- [ ] The star popup titles the star "Cor Caroli", and searching "Cor Caroli" finds it.
- [ ] `checkLessonDraft` on `content/constellations/canes-venatici.mdx` no longer flags "Cor Caroli".
- [ ] The full test suite passes; `next build` succeeds.

## Scope decision to make first

Counting the catalog turns up 20 proper names used by more than one star. Decide whether this
ticket fixes only Cor Caroli or also the other two that look like the same kind of error.

- **Same kind of error (two different stars, one name) — candidates to include.** Check each
  against the IAU star-name list before changing it; these are from memory, not verified.
  - "Marfik" names both λ Ophiuchi (HR 6149) and κ Herculis (HR 6008). The IAU name Marfik
    belongs to λ Oph; κ Her is Marsic.
  - "Markab" names both α Pegasi (HR 8781) and HR 2948, which has no Bayer letter or
    constellation in the catalog. α Peg is the real Markab, and the Pegasus lesson uses it.
- **Leave alone.** "Al Thalimain" on both λ and ι Aquilae is a traditional name that genuinely
  covers the pair. The other 16 duplicates are the components of one multiple star sharing its
  name (Mizar, Castor, Izar, Mintaka and so on), which is correct.
- **Out of scope.** Catalog names that are older variants of the current IAU name (Haldus for
  ε Aurigae, Deneb el Okab for ζ Aquilae, and others). Renaming those would put the popup out
  of step with lessons already written from the catalog.

If the other two are included, a guard is worth adding: a test over the committed catalog
that no proper name is shared by stars with different Bayer designations, with Al Thalimain
as the one listed exception.
