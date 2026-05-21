// Pure helpers for resolving a catalog star's distance, in light-years.
// Used by the data-build pipeline (fetch-bsc.mjs). No I/O — unit-testable.

export const PARSEC_TO_LY = 3.261563;

// Curated distances for iconic stars whose trigonometric parallax — from both
// Hipparcos and the Bright Star Catalog — is too noisy to trust. These are
// distant supergiants whose relative parallax error exceeds ~20%; their
// accepted distances come from radio interferometry, cluster membership, or
// luminosity modeling rather than parallax. Keyed by Yale BSC HR number.
export const CURATED_DISTANCES = {
  2061: { ly: 640, label: "Betelgeuse" }, // VLA radio parallax + modeling
  1713: { ly: 860, label: "Rigel" }, // spectroscopic + Orion-region membership
  7924: { ly: 2615, label: "Deneb" }, // luminosity modeling; Hipparcos σ ~56%
};

// BSC Parallax column: signed arcseconds as a string ("+.014", "-.001").
// Negative or zero parallax is measurement noise on distant stars — unknown.
export function bscParallaxToLy(raw) {
  if (raw == null) return null;
  const arcsec = Number(raw);
  if (!Number.isFinite(arcsec) || arcsec <= 0) return null;
  return (1 / arcsec) * PARSEC_TO_LY;
}

// Hipparcos Plx is in milliarcseconds. Non-positive values are noise.
export function hipparcosToLy(plxMas) {
  if (!Number.isFinite(plxMas) || plxMas <= 0) return null;
  return (1000 / plxMas) * PARSEC_TO_LY;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// Fallback chain: curated override → Hipparcos → BSC → null.
// Returns { distLy, source } where source is "curated" | "hipparcos" | "bsc",
// or null when no usable parallax exists.
export function resolveDistanceLy({ hr, hipPlx, bscParallax }) {
  const curated = CURATED_DISTANCES[hr];
  if (curated) return { distLy: curated.ly, source: "curated" };

  const hip = hipparcosToLy(hipPlx);
  if (hip != null) return { distLy: round1(hip), source: "hipparcos" };

  const bsc = bscParallaxToLy(bscParallax);
  if (bsc != null) return { distLy: round1(bsc), source: "bsc" };

  return null;
}
