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

- [x] HR 4915 (α² CVn) is named "Cor Caroli" in `public/data/bsc5.json`; HR 4785 (β CVn) is still "Chara".
- [x] The correction lives in the build (a tested pure helper used by `fetch-bsc.mjs`), so rerunning `npm run data:fetch:bsc` keeps it.
- [x] Test: the helper returns the curated name for a corrected HR number and the source name unchanged for every other star, including one with no name.
- [x] The regenerated `bsc5.json` differs from the committed one only in the intended names — no positions, magnitudes or distances move.
- [x] The star popup titles the star "Cor Caroli", and searching "Cor Caroli" finds it.
- [x] `checkLessonDraft` on `content/constellations/canes-venatici.mdx` no longer flags "Cor Caroli".
- [x] The full test suite passes; `next build` succeeds.

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

## Resolution

**Scope decision: fix all three same-kind errors**, not only Cor Caroli. Each was checked
against the IAU Working Group on Star Names list rather than from memory:

| HR | Source `Common` | Now | Why |
| --- | --- | --- | --- |
| 4915 (α² CVn) | Chara | **Cor Caroli** | IAU: Cor Caroli is α² CVn; Chara is β CVn (HR 4785), which keeps it. |
| 6008 (κ Her) | Marfik | **Marsic** | IAU: Marfik is λ Oph (HR 6149), which keeps it; κ Her is Marsic. |
| 2948 (no Bayer letter) | Markab | *(no name)* | IAU: Markab is α Peg (HR 8781) only. The IAU list gives HR 2948 no name of its own, so the fix is to drop the wrong one, not invent a replacement. The popup shows "HR 2948". |

No lesson mentions Marfik, Marsic or HR 2948 (the Pegasus lesson's Markab is the real α Peg),
so no lesson needed changing and none now disagrees with the popup.

Left alone, as the scope note says: Al Thalimain (λ and ι Aquilae, a traditional name for the
pair), the 16 multiple-star components that share a name correctly, and the older-variant
names (Haldus, Deneb el Okab…).

**What changed**

- `scripts/lib/star-name.mjs` (+ `.d.mts`): `CURATED_NAMES`, keyed by HR number, and a pure
  `resolveStarName({ hr, commonName })` — curated override, else the source's name, else
  `null`. `null` in the table means "no proper name". Applied in `fetch-bsc.mjs` where
  `star.name` is set, so rerunning `npm run data:fetch:bsc` keeps the correction.
- `tests/star-catalog/star-name.test.ts`: the helper (curated name, dropped name, number or
  string HR, unchanged pass-through including the real Chara, Marfik and Markab, no name) and
  a guard over the committed catalog: no proper name is shared by stars with different Bayer
  designations, with Al Thalimain as the one listed exception. Written first and seen failing.
- `public/data/bsc5.json` regenerated.

**Verified**

- Old and regenerated catalogs compared field by field: same 9,096 stars in the same order,
  and exactly three differences, the `name` of HR 4915, 6008 and 2948. No position,
  magnitude, colour or distance moved, so the upstream source had not drifted.
- `npm test`: 509 pass (499 before, plus 10 new). `npm run build` passes.
- `searchStars` returns one star each for "Cor Caroli", "Chara", "Marsic", "Marfik" and
  "Markab". `StarPopup` titles a star `name ?? Bayer ?? "HR n"`, so HR 4915 reads "Cor
  Caroli". Not checked by clicking the star on the canvas.
- `checkLessonDraft` on `canes-venatici.mdx`: clean (it flagged "Cor Caroli" before).
