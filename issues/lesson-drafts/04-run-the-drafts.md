# Ticket 4: Run the drafts

> Source spec: `plans/v2-lesson-drafts.md`

**What to build:** Operator work. The one real run that produces all 73 drafts, split into the
seven review branches.

1. In the Anthropic Console, create a dedicated key (e.g. `telescope-lesson-drafts`) with a small
   spend limit, and put it in `.env.local`.
2. Run the script with `--dry-run`, then for real. Rerun for any retries.
3. Split the output onto seven `feat/lessons-<group>` branches off `develop`, following the
   groups in tickets 5–11, each with its slice of the review report.
4. Revoke the key once all seven review PRs are merged.

**Blocked by:** 3. The drafting script.

- [x] All 73 drafts written (after retries), with a review report.
- [x] Total spend recorded, and under $5.
- [x] Seven branches exist, each containing only its group's lesson files.
- [ ] The dedicated key is revoked after the last review PR merges.

## Run record (2026-10-01)

- **Drafts:** 73 written, none rejected, errored or expired, so no retry run was needed.
  62 clean and 11 flagged in the review report.
- **Batches:** `msgbatch_018Q7M5LYThKThJsJPMqQJfq` (Lyra alone, the `--only` check) and
  `msgbatch_01BzFBaNpNYxym5C6ucuXr6z` (the other 72).
- **Spend:** **$1.12** — $0.016 for Lyra and $1.106 for the 72. Computed from the usage
  reported in the batch results (36,843 uncached input, 173,568 cache-read, 24,408 cache-write
  and 69,181 output tokens) at Claude Opus 5 batch rates. The Console is the authoritative
  figure.
- **Checks before splitting:** `npm test` and `npm run build` both pass with all 88 lesson
  files present, so every draft compiles as MDX.
- **Branches**, each one commit ahead of `develop`, pushed with one review PR each:
  `feat/lessons-a` (11), `-b` (11), `-c` (11), `-d` (10), `-e` (10), `-f` (10), `-g` (10).
- **Report slices** for the PR descriptions:
  `.cache/lesson-drafts/review-report-group-<a–g>.md` (gitignored, like the full report).

### Note on the flags

All 12 flags (across 11 drafts) trace to gaps in the checker rather than invented facts.
Reviewers still confirm each one, but should expect "confirmed correct":

- **Nine "is not named in the fact sheet" flags for numbered Bayer stars** (Gamma² Delphini,
  Delta-1 Apodis, Gamma¹ Caeli, Alpha² Centauri, Gamma² Normae, Zeta-2 Reticuli, Beta-1
  Tucanae, Gamma² Velorum, Gamma² Volantis). Each star is on its fact sheet as e.g.
  `γ² Delphini`; the checker does not recognise the spelled-out form with its number.
- **Delphinus, "Job's Coffin":** a real asterism name the checker's asterism list lacks.
- **Crux, "magnitude 1.73" for Acrux:** the fact sheet's magnitude for α² Crucis, quoted for
  that companion inside the Acrux bullet.
- **Pictor, "magnitude 3.9 and 63":** the 63 is "63 light-years", read as a second magnitude.

Follow-up, outside this ticket: teach `checkLessonDraft` those three cases (numbered Bayer
names spelled out, a companion's numbers inside another star's bullet, a distance following
"and" after a magnitude).

Until the review PRs merge, `develop` still has only the 15 handwritten lessons. Running
`npm run lessons:draft` there would draft — and pay for — all 73 again.
