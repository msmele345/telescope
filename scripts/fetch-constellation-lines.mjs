#!/usr/bin/env node
// Downloads the d3-celestial IAU 88 constellation line GeoJSON (BSD license,
// https://github.com/ofrohn/d3-celestial) and writes a compact JSON map of
// IAU-3 letter abbrev → array of polylines, where each polyline is an array
// of [raRad, decRad] vertex pairs. Idempotent — safe to re-run.

import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE =
  "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");
const OUT_PATH = join(OUT_DIR, "constellation-lines.json");

const DEG = Math.PI / 180;

async function main() {
  console.log(`Fetching ${SOURCE} …`);
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const fc = await res.json();
  if (fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    throw new Error("Source is not a GeoJSON FeatureCollection");
  }
  console.log(`  Received ${fc.features.length} features.`);

  const out = {};
  for (const feat of fc.features) {
    const id = feat.id;
    if (!id) continue;
    const geom = feat.geometry;
    if (!geom || geom.type !== "MultiLineString") continue;
    const polylines = geom.coordinates.map((line) =>
      line.map(([raDeg, decDeg]) => [raDeg * DEG, decDeg * DEG])
    );
    out[id] = polylines;
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(out));

  const segCount = Object.values(out).reduce(
    (a, polys) =>
      a + polys.reduce((b, line) => b + Math.max(0, line.length - 1), 0),
    0
  );
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  Constellations: ${Object.keys(out).length}`);
  console.log(`  Line segments: ${segCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
