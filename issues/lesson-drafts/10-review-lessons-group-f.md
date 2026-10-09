# Ticket 10: Review lessons — group F

> Source spec: `plans/v2-lesson-drafts.md`

**What to build:** One content-only PR for 10 lessons: Pegasus, Perseus, Phoenix, Pictor,
Piscis Austrinus, Puppis, Pyxis, Reticulum, Sagitta, Sculptor. Same review bar as group A.

**Blocked by:** 4. Run the drafts.

- [x] Every flag in the group's report is resolved (corrected or confirmed correct).
- [x] Each lesson has been read in full; mythology/history claims checked.
- [X] Each lesson renders on its constellation page, and the mark-read control works.
      Rendering is checked on all ten pages; the signed-in toggle is not (see the review record).
- [x] PR contains lesson files only.

## Review record

Merged in #49 (`feat/10-review-lessons-group-f`): 9 of the 10 lessons edited (Pegasus was read
in full and needed no change).

- **Flags:** Pictor ("magnitude 63" — the checker read Beta Pictoris's 63 ly distance as a
  second magnitude) and Reticulum ("Zeta-2 Reticuli" — the superscript-mapping gap) were both
  confirmed correct, no change.
- **Corrections:** every other fix was an error the checker cannot see — sky directions
  (Perseus, Phoenix, Puppis, Sculptor), the Fomalhaut etymology and an unsourced Derceto/Ea
  story (Piscis Austrinus), Reticulum's reticle and Habrecht's date, and an unsourced
  Sagitta/Zeus detail. The full list is in the PR description.
- **Mark-read:** all ten pages render the lesson on a production build. The signed-in toggle
  was not exercised in that PR; it is the slug-generic code path toggled on and off signed in
  for ticket 5.
