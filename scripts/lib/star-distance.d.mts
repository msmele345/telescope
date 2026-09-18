export declare const PARSEC_TO_LY: number;

/** Keyed by Yale BSC HR number. */
export declare const CURATED_DISTANCES: Record<
  string | number,
  { ly: number; label: string }
>;

/** Yale BSC parallax, in arcseconds, as it appears in the catalog. */
export declare function bscParallaxToLy(
  raw: string | number | null | undefined
): number | null;

/** Hipparcos parallax, in milliarcseconds. */
export declare function hipparcosToLy(
  plxMas: number | null | undefined
): number | null;

export declare function resolveDistanceLy(input: {
  hr: string | number;
  hipPlx?: number | null;
  bscParallax?: string | number | null;
}): { distLy: number; source: "curated" | "hipparcos" | "bsc" } | null;
