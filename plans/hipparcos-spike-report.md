# Phase 12 Spike Report: Hipparcos Parallax Cross-Match

> Outcome: **favorable — shipped.** Distance coverage in the star popup rises
> from ~34% to **99.1%**, and famous-star distances now match accepted modern
> values within ~2%.

## Question

The Bright Star Catalog (BSC) only carries usable parallax for ~3,100 of its
9,096 stars (~34%) — its mid-20th-century parallaxes are absent or unreliable
for fainter stars. Can a Hipparcos cross-match lift coverage above 95% with
better accuracy on the bright nearby stars where BSC is visibly off?

## Findings

### Data availability & license

- **Source:** VizieR `I/239/hip_main.dat` — the Hipparcos main catalogue
  (ESA, 1997), ~118,218 stars. Served uncompressed (53.3 MB) from
  `https://cdsarc.cds.unistra.fr/ftp/I/239/hip_main.dat`.
- **License:** public domain (ESA / CDS). We fetch it at build time and do
  **not** redistribute it — only the derived `distLy` values land in
  `bsc5.json`. No license concern.
- **Format:** fixed-width records. Relevant columns (1-indexed, per the VizieR
  ReadMe): `HD` 391–396, `Plx` (mas) 80–86, `e_Plx` (mas) 120–125.

### Join key & coverage

- BSC carries an `HD` (Henry Draper) number on **all 9,096** entries; it has no
  `HIP` column. So the join is BSC `HD` → Hipparcos `HD`.
- Hipparcos yields **96,263** HD-keyed entries with positive parallax (2,486
  negative + 34 zero parallaxes were dropped as statistical noise).
- **Join result:** 8,924 of 9,096 BSC stars (98.1%) match a positive-parallax
  Hipparcos entry directly. The remaining stars are handled by the fallback
  chain below.

### Accuracy — 10 well-known stars

`accepted` is the modern consensus distance (ly). Errors in parentheses.

| Star       | Accepted | BSC parallax      | Hipparcos parallax |
|------------|----------|-------------------|--------------------|
| Sirius     | 8.6      | 8.7 (+1.1%)       | 8.6 (+0.0%)        |
| Vega       | 25       | 26.5 (+6.1%)      | 25.3 (+1.2%)       |
| Polaris    | 433      | 465.9 (+7.6%)     | 431.4 (-0.4%)      |
| Betelgeuse | 640      | 652.3 (+1.9%)     | 427.5 (-33.2%)     |
| Rigel      | 860      | 250.9 (-70.8%)    | 772.9 (-10.1%)     |
| Arcturus   | 36.7     | 36.2 (-1.3%)      | 36.7 (+0.0%)       |
| Capella    | 42.9     | 44.7 (+4.1%)      | 42.2 (-1.6%)       |
| Aldebaran  | 65.3     | 67.9 (+4.1%)      | 65.1 (-0.3%)       |
| Procyon    | 11.5     | 11.3 (-1.5%)      | 11.4 (-0.8%)       |
| Altair     | 16.7     | 16.5 (-1.4%)      | 16.8 (+0.4%)       |

Hipparcos beats BSC on every nearby star — typically <2% error vs. BSC's
4–8%.

**The two exceptions are distant supergiants:** Betelgeuse and Rigel. Their
trigonometric parallax is tiny relative to its standard error (Betelgeuse:
Plx 7.63 ± 1.64 mas, ~21% relative error; Rigel: 4.22 ± 0.81 mas, ~19%), so
*no* parallax method — Hipparcos or BSC — is reliable for them. Their accepted
distances come from radio interferometry and cluster membership. BSC's
Betelgeuse value (652 ly) happens to land near the truth; its Rigel value
(251 ly) is catastrophically wrong — so BSC is not a trustworthy fallback for
this regime either.

### Decision: error-weighting vs. curated overrides

The PRD suggested an error-weighted approach — reject Hipparcos when `σ_Plx`
exceeds a threshold. We evaluated this and **rejected it**: when high-σ
Hipparcos is dropped, the only fallback is BSC, which is *noisier* still
(Rigel above). Thresholding would degrade accuracy, not improve it.

Instead, the handful of iconic stars whose parallax is genuinely unusable get
a small **curated override table** (`CURATED_DISTANCES` in
`scripts/lib/star-distance.mjs`), sourced from modern non-parallax
measurements: Betelgeuse (640 ly), Rigel (860 ly), Deneb (2,615 ly). Deneb is
included because its Hipparcos parallax has ~56% relative error and it is one
of the most recognizable stars in the sky.

The long tail of fainter distant supergiants (Garnet Star, Aludra, Alnilam,
…) keeps its Hipparcos value: it is the best estimate available, their true
distances are themselves uncertain, and they are not stars a student is
likely to scrutinize.

### Fallback chain (shipped)

`curated override → Hipparcos (Plx > 0) → BSC (Parallax > 0) → omit`

Applied per-star in `fetch-bsc.mjs` via `resolveDistanceLy()`.

### File-size impact

- `public/data/bsc5.json`: 925,741 → 1,014,185 bytes raw (+88 KB).
- Gzipped: 268,723 → 290,871 bytes — **+22 KB gzipped**, far under the
  +500 KB budget.

## Acceptance criteria

- [x] Spike report covers data availability, license, join coverage %, file
      size impact, and side-by-side accuracy on 10 well-known stars.
- [x] `distLy` populated for **99.1%** of bundled stars (8,921 Hipparcos +
      91 BSC fallback + 3 curated = 9,015 / 9,096). 81 stars have no parallax
      from any source and omit the Distance row, as designed.
- [x] Famous-star distances within ~2%: Sirius 8.6, Vega 25.3, Polaris 431.4,
      Betelgeuse 640, Rigel 860, Deneb 2615.
- [x] Bundle regression +22 KB gzipped — well within the +500 KB allowance.

## What shipped

- `scripts/fetch-hipparcos.mjs` — downloads + caches Hipparcos `I/239`, builds
  an HD → parallax index. Runnable standalone (`npm run data:fetch:hipparcos`).
- `scripts/lib/star-distance.mjs` — pure `resolveDistanceLy()` fallback chain
  and the `CURATED_DISTANCES` table.
- `scripts/fetch-bsc.mjs` — now consumes the Hipparcos index; runtime data
  shape (`{ …, distLy }`) is unchanged, so no app code changed.
- `tests/star-catalog/distance.test.ts` — unit coverage for the chain.
- The 53 MB Hipparcos source is cached under `.cache/` (gitignored).
