#!/usr/bin/env node
// Downloads a public US zipcode → lat/lng dataset and writes a minimal JSON
// ([{zip, lat, lng, city, state}, ...]) to public/data/zipcodes.json.
// Idempotent — safe to re-run.
//
// Source: millbj92/US-Zip-Codes-JSON (public domain, derived from US Census).
// If the source moves, swap SOURCE and the row mapping below.

import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE =
  "https://raw.githubusercontent.com/millbj92/US-Zip-Codes-JSON/master/USCities.json";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");
const OUT_PATH = join(OUT_DIR, "zipcodes.json");

async function main() {
  console.log(`Fetching ${SOURCE} …`);
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const raw = await res.json();
  console.log(`  Received ${raw.length} records.`);

  const rows = [];
  const seen = new Set();
  for (const r of raw) {
    const zipNum = r.zip_code ?? r.zipCode ?? r.zip;
    if (zipNum == null) continue;
    const zip = String(zipNum).padStart(5, "0");
    if (zip.length !== 5 || !/^\d{5}$/.test(zip)) continue;
    if (seen.has(zip)) continue;
    seen.add(zip);
    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const entry = { zip, lat, lng };
    if (r.city) entry.city = String(r.city);
    if (r.state) entry.state = String(r.state);
    rows.push(entry);
  }

  rows.sort((a, b) => (a.zip < b.zip ? -1 : a.zip > b.zip ? 1 : 0));

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(rows));
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  Zipcodes: ${rows.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
