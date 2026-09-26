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

- [ ] All 73 drafts written (after retries), with a review report.
- [ ] Total spend recorded, and under $5.
- [ ] Seven branches exist, each containing only its group's lesson files.
- [ ] The dedicated key is revoked after the last review PR merges.
