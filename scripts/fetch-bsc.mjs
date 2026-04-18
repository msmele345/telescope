#!/usr/bin/env node
// Downloads the Yale Bright Star Catalog and writes a minimal JSON
// (id, ra, dec, mag, name?, bayer?, constellation?, colorK?) to
// public/data/bsc5.json. Idempotent — safe to re-run.

import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE =
  "https://raw.githubusercontent.com/brettonw/YaleBrightStarCatalog/master/bsc5-short.json";

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

  const stars = raw.map((s) => {
    const star = {
      id: Number(s.HR),
      ra: parseRA(s.RA),
      dec: parseDec(s.Dec),
      mag: Number(s.V),
    };
    if (s.N) star.name = s.N;
    if (s.B) star.bayer = s.B;
    if (s.C) star.constellation = s.C;
    if (s.K) star.colorK = Number(s.K);
    return star;
  });

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(stars));

  const named = stars.filter((s) => s.name).length;
  const magRange = stars.reduce(
    (a, s) => ({ min: Math.min(a.min, s.mag), max: Math.max(a.max, s.mag) }),
    { min: Infinity, max: -Infinity }
  );
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  Stars: ${stars.length} (${named} named)`);
  console.log(`  Magnitude range: ${magRange.min} … ${magRange.max}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
