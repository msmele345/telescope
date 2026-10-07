# Ticket 9: Review lessons — group E

> Source spec: `plans/v2-lesson-drafts.md`

**What to build:** One content-only PR for 10 lessons: Lynx, Lyra, Mensa, Microscopium,
Monoceros, Musca, Norma, Octans, Ophiuchus, Pavo. Same review bar as group A.

**Blocked by:** 4. Run the drafts.

- [x] Every flag in the group's report is resolved (corrected or confirmed correct).
- [x] Each lesson has been read in full; mythology/history claims checked.
- [ ] Each lesson renders on its constellation page, and the mark-read control works.
      Rendering is checked on all ten pages; the signed-in toggle is not (see the review record).
- [x] PR contains lesson files only.

## Review record

Merged in #48 (`feat/09-review-lessons-group-e`): all 10 lessons edited. The drafts merged
unreviewed in #38, so the review shipped as a corrections PR. The PR description is the full
record; this is the summary.

- **Flags:** Norma ("Gamma² Normae") confirmed correct, no change. `γ² Normae` is on the fact
  sheet; the checker does not map the spelled-out form with the superscript.
- **Corrections:** every lesson needed at least one fix the checker cannot see. The largest:
  Lyra had Zeus send an eagle to fetch the lyre (it was the Muses, at the command of Apollo
  and Zeus) and called Vega's 10,000 K colour "cold"; Musca credited the bee to Plancius's
  globe rather than Bayer's atlas; Lynx put Alpha Lyncis nearest Leo rather than Cancer;
  Microscopium, Norma, Ophiuchus, Musca and Pavo gave directions that lead to the wrong part
  of the sky.
- **Catalog notes:** where Wikipedia and the catalog differ (Beta Monocerotis's combined
  magnitude, Alpha Lyncis's distance) the catalog won. Monoceros (M50) and Ophiuchus (M9,
  M10, M12, M14, M19, M62, M107) hold Messier objects the app's bright-object subset omits,
  so their lessons mention none; adding them is a data change.
- **Mark-read:** all ten pages render the lesson in local dev. The signed-in toggle was not
  exercised in that PR; it is the slug-generic code path toggled on and off signed in for
  ticket 5.
