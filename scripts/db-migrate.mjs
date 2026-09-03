#!/usr/bin/env node
// Apply every .sql file in scripts/migrations in lexical order.
// Tracks applied filenames in a `_migrations` table so reruns are no-ops.
//
// Usage: node scripts/db-migrate.mjs
// Requires POSTGRES_URL_NON_POOLING (or POSTGRES_URL) in the environment.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import pg from "pg";

const envFile = process.env.DOTENV_FILE || ".env.local";
dotenvExpand.expand(dotenv.config({ path: envFile }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "migrations");

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "No Postgres connection string found. Run `npm run env:pull` first."
  );
  process.exit(1);
}

// Strip sslmode from the URL so our explicit ssl object wins (Supabase pooler
// ships with sslmode=require which pg now treats as verify-full and trips on
// the self-signed chain).
const cleanedConnectionString = connectionString.replace(
  /([?&])sslmode=[^&]*&?/i,
  (_m, sep) => (sep === "?" ? "?" : "")
).replace(/[?&]$/, "");

const client = new pg.Client({
  connectionString: cleanedConnectionString,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  await client.query(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name        TEXT PRIMARY KEY,
       applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`
  );

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const { rows } = await client.query("SELECT name FROM _migrations");
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`· skip ${file} (already applied)`);
      continue;
    }
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    console.log(`→ apply ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }

  console.log("✓ migrations up to date");
} finally {
  await client.end();
}
