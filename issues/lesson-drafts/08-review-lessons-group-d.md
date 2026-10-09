# Ticket 8: Review lessons — group D

> Source spec: `plans/v2-lesson-drafts.md`

**What to build:** One content-only PR for 10 lessons: Grus, Hercules, Horologium, Hydra,
Hydrus, Indus, Lacerta, Leo Minor, Lepus, Lupus. Same review bar as group A.

**Blocked by:** 4. Run the drafts.

- [x] Every flag in the group's report is resolved (corrected or confirmed correct).
- [x] Each lesson has been read in full; mythology/history claims checked.
- [X] Each lesson renders on its constellation page, and the mark-read control works.
- [X] PR contains lesson files only.

## Review record (2026-10-03)

- **Flags:** the report had none (10 clean). After the corrections below all 10 lessons still
  check clean against their fact sheets, with no new flags.
- **Corrections:** every lesson needed at least one fix the checker cannot see. Directions and
  positions: Horologium lay east of Achernar, not west; Hydra's head is due east of Procyon, not
  south-east; Lacerta is near the zenith on October evenings, not in the north-east; Indus is
  reached from Alnair (the Achernar route led nowhere near it); Hydrus is visible from the
  tropics and the far southern edge of North America, not only below 10°N, and Hydra is
  equatorial, not "of the northern sky"; Hercules' legs go north to Draco and its head south to
  Ophiuchus, and its victims are spring constellations, not "nearby". Myth and history: Hydra's
  raven tale (the raven blamed the snake; Apollo did not send it); Lupus became a wolf through
  the Latin translation of Ptolemy, not under the Romans, and the Babylonian figure is UR.IDIM,
  the "mad dog", not "Urbat"; Lepus lost an unsupported "bird transformed by Hermes" story and
  a moral invented for the Leros tale (now Hyginus' account, plus Hermes honouring the hare's
  swiftness); Grus lost an unsupported claim about Dutch associations with cranes; Hydrus lost
  an unsupported "useful to navigators" claim; Horologium's naming history now starts from
  Lacaille's French "l'Horloge". Leo Minor's garbled Alpha/Beta paragraph now says plainly that
  only Beta received a Greek letter, and its "nothing brighter than fourth magnitude" (Praecipua
  is 3.8) is fixed. Lacerta and Leo Minor no longer claim Hevelius published in 1687; he died
  that year and the atlas appeared in 1690, so they now say he *introduced* the constellations
  in 1687. Lupus no longer says it "has no named stars" (Alpha Lupi was named Uridim by the IAU
  in 2024; the catalog does not carry that name, so the lesson avoids both claims).
- **Verified:** `npm test` (499 pass) and `npm run build`; on the production build all 10 pages
  render their four sections. **Not yet done:** toggling mark-read while signed in (needs an
  interactive sign-in against the dev database), so that box stays open.

### Follow-ups, outside this ticket

- **Sextans** (still to review) uses the same "published in his star atlas of 1687" wording
  for Hevelius; Canes Venatici's "introduced in 1687" is fine.
- **Catalog gaps the lessons inherit:** the star catalog carries no proper names for α/β Lupi
  or β Gruis (Tiaki), so the lessons use Greek letters for them.
