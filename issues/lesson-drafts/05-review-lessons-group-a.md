# Ticket 5: Review lessons — group A

> Source spec: `plans/v2-lesson-drafts.md`

**What to build:** One content-only PR for 11 lessons: Andromeda, Antlia, Apus, Aquila, Ara,
Auriga, Boötes, Caelum, Camelopardalis, Canes Venatici, Canis Major. The PR description carries
this group's slice of the review report. Every flag is resolved, and every lesson is read for
accuracy and tone. Merging makes these lessons live.

**Blocked by:** 4. Run the drafts.

- [x] Every flag in the group's report is resolved (corrected or confirmed correct).
- [x] Each lesson has been read in full; mythology/history claims checked.
- [x] Each lesson renders on its constellation page, and the mark-read control works.
- [x] PR contains lesson files only.

## Review record (2026-10-01)

The drafts merged unreviewed in #34 and reached `main` in #41, so the lessons were already
live. The review therefore ships as a corrections PR from `feat/05-review-lesson-group-a`
rather than as the PR that makes them live. These boxes are ticked in a separate docs change
so that PR stays lesson files only, as #33 did for tickets 3 and 4.

- **Flags:** both confirmed correct. `δ¹ Apodis` and `γ¹ Caeli` are on their fact sheets; the
  checker does not parse the spelled-out numbered form. Apus now writes `Delta¹` / `Delta²`
  to match the other lessons.
- **Corrections:** all 11 lessons were read in full and every one needed at least one fix
  the checker cannot see. The largest: Canes Venatici named its brightest star Chara rather
  than Cor Caroli; Antlia credited Boyle's pump rather than Papin's; Boötes had Dionysus
  rather than Zeus place Icarius in the sky; Caelum, Auriga, Andromeda and Camelopardalis
  gave directions that lead to the wrong part of the sky. The full list is in the PR
  description.
- **New flag:** `"Cor Caroli" is not named in the fact sheet`. Expected: see the first
  follow-up.
- **Verified:** `npm test` (499 pass) and `npm run build`; in local dev all 11 pages render
  their four sections with the lesson description, and mark-read was toggled on, reloaded,
  and toggled off on Canes Venatici while signed in.

### Follow-ups, outside this ticket

- **The star catalog names both α² CVn and β CVn "Chara"** (`public/data/bsc5.json`, ids 4915
  and 4785, from the upstream `Common` field read by `scripts/fetch-bsc.mjs`). The star popup
  still calls Cor Caroli "Chara", so the corrected lesson now disagrees with it. The lesson is
  right; the catalog needs the fix.
- **Later groups likely carry the same kinds of error.** The checker found none of the above,
  so tickets 6–11 need the same full read, not only flag resolution.
- **Catalog oddities the lessons inherit unchanged**, since the fact sheet is the only
  permitted source of numbers: Izar listed twice (its two components), "Al Thalimain" naming
  two stars in Aquila, and colour temperatures that are rough colour-index estimates.
