# Ticket 11: Review lessons — group G

> Source spec: `plans/v2-lesson-drafts.md`

**What to build:** One content-only PR for 10 lessons: Scutum, Serpens, Sextans, Telescopium,
Triangulum, Triangulum Australe, Tucana, Vela, Volans, Vulpecula. Same review bar as group A.

**Blocked by:** 4. Run the drafts.

- [x] Every flag in the group's report is resolved (corrected or confirmed correct).
- [x] Each lesson has been read in full; mythology/history claims checked.
- [X] Each lesson renders on its constellation page, and the mark-read control works.
      Rendering is checked on all ten pages; the signed-in toggle is not (see the review record).
- [x] PR contains lesson files only.

## Review record

Open as #50 (`feat/11-review-lessons-group-g`): all 10 lessons edited. The PR description is the
full record (flags table, every correction as was/now, what was checked and left alone,
catalog notes); this is the summary.

- **Flags:** Tucana ("Beta-1 Tucanae"), Vela ("Gamma² Velorum") and Volans ("Gamma² Volantis")
  are the same superscript-mapping gap as groups E and F: confirmed correct. The Tucana flag
  went away when its bullet was rewritten. One **new** flag, "47 Tucanae", comes from a
  sentence added in review and is a false positive (it is a globular cluster, not a star).
- **Corrections:** every lesson needed at least one fix the checker cannot see. The largest:
  Triangulum Australe called three stars "near-equal" when Atria is nearly a magnitude
  brighter, and credited Bayer with letters Lacaille assigned; Triangulum had its base and
  apex backwards and an unsourced Hermes "tradition"; Vulpecula gave Hevelius a reason for
  the fox's placement that is not his (his was hunting animals, and Cerberus); Volans had an
  invented "joke" and directions that lead to the wrong part of the sky; Tucana omitted 47
  Tucanae and the Small Magellanic Cloud.
- **Mark-read:** all ten pages render the lesson on a production build. The signed-in toggle
  was not exercised: this session could not confirm that `.env.local` points at the Neon `dev`
  branch, and the toggle writes to it. It is the slug-generic code path verified signed in
  for ticket 5.
