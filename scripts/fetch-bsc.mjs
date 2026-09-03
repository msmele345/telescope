#!/usr/bin/env node
// Downloads the Yale Bright Star Catalog and writes a minimal JSON
// (id, ra, dec, mag, name?, bayer?, constellation?, colorK?, distLy?) to
// public/data/bsc5.json. Idempotent — safe to re-run.
//
// `distLy` is resolved through a fallback chain (curated → Hipparcos → BSC):
// the Hipparcos cross-match lifts distance coverage from ~34% to ~99%.

import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadHipparcosByHD } from "./fetch-hipparcos.mjs";
import { resolveDistanceLy } from "./lib/star-distance.mjs";

// bsc5-all.json keeps fields the short variant drops — notably Parallax
// (arcseconds) and Common (proper name).
const SOURCE =
  "https://raw.githubusercontent.com/brettonw/YaleBrightStarCatalog/master/bsc5-all.json";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");
const OUT_PATH = join(OUT_DIR, "bsc5.json");

const DEG = Math.PI / 180;
const HOUR_TO_DEG = 15;

function parseRA(raw) {
  // "00h 05m 09.9s" → radians
  const m = raw.match(/^(\d+)h\s+(\d+)m\s+([\d.]+)s$/);
  if (!m) throw new Error(`unparseable RA: ${raw}`);
  const [, h, mi, s] = m;
  const hours = Number(h) + Number(mi) / 60 + Number(s) / 3600;
  return hours * HOUR_TO_DEG * DEG;
}

function parseDec(raw) {
  // "+45° 13′ 45″" or "−45° 13′ 45″" (note unicode minus)
  const m = raw.match(/^([+\-−])(\d+)°\s+(\d+)[′']\s+([\d.]+)[″"]$/);
  if (!m) throw new Error(`unparseable Dec: ${raw}`);
  const [, sign, d, mi, s] = m;
  const deg = Number(d) + Number(mi) / 60 + Number(s) / 3600;
  return (sign === "+" ? 1 : -1) * deg * DEG;
}

async function main() {
  console.log(`Fetching ${SOURCE} …`);
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const raw = await res.json();
  console.log(`  Received ${raw.length} records.`);

  console.log("Loading Hipparcos parallax index …");
  const { byHd } = await loadHipparcosByHD();
  console.log(`  ${byHd.size} HD-keyed Hipparcos entries.`);

  const sources = { curated: 0, hipparcos: 0, bsc: 0, none: 0 };
  const stars = raw.map((s) => {
    const star = {
      id: Number(s.HR),
      ra: parseRA(s.RA),
      dec: parseDec(s.Dec),
      mag: Number(s.Vmag),
    };
    if (s.Common) star.name = s.Common;
    if (s.Bayer) star.bayer = s.Bayer;
    if (s.Constellation) star.constellation = s.Constellation;
    if (s.K) star.colorK = Number(s.K);

    const hd = parseInt(String(s.HD).trim(), 10);
    const hip = Number.isFinite(hd) ? byHd.get(hd) : undefined;
    const dist = resolveDistanceLy({
      hr: star.id,
      hipPlx: hip ? hip.plx : null,
      bscParallax: s.Parallax,
    });
    if (dist) {
      star.distLy = dist.distLy;
      sources[dist.source]++;
    } else {
      sources.none++;
    }
    return star;
  });

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(stars));

  const named = stars.filter((s) => s.name).length;
  const withDist = stars.filter((s) => s.distLy !== undefined).length;
  const coverage = ((100 * withDist) / stars.length).toFixed(1);
  const magRange = stars.reduce(
    (a, s) => ({ min: Math.min(a.min, s.mag), max: Math.max(a.max, s.mag) }),
    { min: Infinity, max: -Infinity }
  );
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  Stars: ${stars.length} (${named} named, ${withDist} with distance — ${coverage}%)`);
  console.log(
    `  Distance source: ${sources.hipparcos} Hipparcos, ${sources.bsc} BSC, ` +
      `${sources.curated} curated, ${sources.none} none`
  );
  console.log(`  Magnitude range: ${magRange.min} … ${magRange.max}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
