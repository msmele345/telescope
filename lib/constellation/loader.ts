import type { ConstellationLines } from "./types";

export const DEFAULT_LINES_URL = "/data/constellation-lines.json";

export async function loadConstellationLines(
  url: string = DEFAULT_LINES_URL
): Promise<ConstellationLines> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to load constellation lines: ${res.status} ${res.statusText}`
    );
  }
  return (await res.json()) as ConstellationLines;
}
