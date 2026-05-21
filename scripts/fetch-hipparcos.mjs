#!/usr/bin/env node
// Downloads the Hipparcos main catalogue (VizieR I/239, public domain) and
// builds an HD-number → parallax index. fetch-bsc.mjs consumes this to upgrade
// the Bright Star Catalog's distance coverage from ~34% to ~99%.
//
// Idempotent: the 53 MB source is cached under .cache/ (gitignored), so the
// first run downloads and later runs read from disk.
//
// Run directly (`node scripts/fetch-hipparcos.mjs`) to print an index summary.

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// VizieR I/239 hip_main.dat — the Hipparcos main catalogue, ~118k stars.
// Public domain (ESA / CDS); fetched at build time, not redistributed.
const SOURCE = "https://cdsarc.cds.unistra.fr/ftp/I/239/hip_main.dat";
const EXPECTED_BYTES = 53316318;

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "..", ".cache", "hipparcos");
const CACHE_PATH = join(CACHE_DIR, "hip_main.dat");

// Fixed-width byte columns, from the VizieR ReadMe (1-indexed) translated to
// 0-indexed String.slice bounds:
//   HD     391-396  Henry Draper number
//   Plx     80- 86  trigonometric parallax (mas)
//   e_Plx  120-125  standard error in Plx (mas)
const COL = {
  hd: [390, 396],
  plx: [79, 86],
  ePlx: [119, 125],
};

async function fetchSource() {
  try {
    const cached = await stat(CACHE_PATH);
    if (cached.size === EXPECTED_BYTES) {
      console.log(`  Using cached ${CACHE_PATH}`);
      return readFile(CACHE_PATH, "utf8");
    }
  } catch {
    // not cached yet — fall through to download
  }
  console.log(`  Downloading ${SOURCE} (~53 MB) …`);
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const text = await res.text();
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_PATH, text);
  return text;
}

// Returns { byHd: Map<HD, { plx, ePlx }>, negative }. Parallaxes are in
// milliarcseconds. Only positive parallaxes are kept (negatives are
// statistical noise on distant stars). On a duplicate HD — a handful of
// resolved multiples share one — the smaller-error entry wins.
export async function loadHipparcosByHD() {
  const text = await fetchSource();
  const byHd = new Map();
  let negative = 0;
  for (const line of text.split("\n")) {
    if (!line) continue;
    const hd = parseInt(line.slice(...COL.hd), 10);
    if (!Number.isFinite(hd)) continue;
    const plx = parseFloat(line.slice(...COL.plx));
    if (!Number.isFinite(plx)) continue;
    if (plx <= 0) {
      negative++;
      continue;
    }
    const ePlxRaw = parseFloat(line.slice(...COL.ePlx));
    const ePlx = Number.isFinite(ePlxRaw) ? ePlxRaw : Infinity;
    const prev = byHd.get(hd);
    if (!prev || ePlx < prev.ePlx) byHd.set(hd, { plx, ePlx });
  }
  return { byHd, negative };
}

async function main() {
  console.log("Loading Hipparcos main catalogue …");
  const { byHd, negative } = await loadHipparcosByHD();
  console.log(`Wrote in-memory index.`);
  console.log(`  HD-keyed positive-parallax entries: ${byHd.size}`);
  console.log(`  Non-positive parallaxes skipped:    ${negative}`);
}

// CLI when invoked directly; importable as a module otherwise.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
