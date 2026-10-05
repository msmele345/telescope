// Pure helper for resolving a catalog star's proper name.
// Used by the data-build pipeline (fetch-bsc.mjs). No I/O — unit-testable.

// Curated names for stars whose proper name in the source catalog (the `Common`
// field) is wrong: two different stars carry one name. Checked against the IAU
// Working Group on Star Names list. Keyed by Yale BSC HR number; `null` means
// the star has no proper name of its own, so none is shown.
export const CURATED_NAMES = {
  4915: "Cor Caroli", // α² CVn. The source also says "Chara", which is β CVn (HR 4785)
  6008: "Marsic", // κ Her. The source says "Marfik", which is λ Oph (HR 6149)
  2948: null, // The source says "Markab", which is α Peg (HR 8781) and no other star
};

// Fallback chain: curated override → the source's name → null (no name).
export function resolveStarName({ hr, commonName }) {
  if (Object.hasOwn(CURATED_NAMES, hr)) return CURATED_NAMES[hr];
  return commonName || null;
}
