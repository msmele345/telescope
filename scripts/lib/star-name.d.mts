/** Keyed by Yale BSC HR number. `null` means the star has no proper name. */
export declare const CURATED_NAMES: Record<string | number, string | null>;

export declare function resolveStarName(input: {
  hr: string | number;
  /** The source catalog's `Common` field. */
  commonName?: string | null;
}): string | null;
