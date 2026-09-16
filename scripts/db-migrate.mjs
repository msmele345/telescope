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
import { assessTenancy, tablesCreatedByMigrations } from "./lib/db-guardrail.mjs";

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

// Say out loud where this is pointed. Every environment shares one instance,
// so "which database am I about to migrate" is never a rhetorical question.
const target = new URL(cleanedConnectionString);
console.log(`→ target ${target.host}${target.pathname}`);

try {
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  await assertNotCoTenanted(client, files);

  await client.query(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name        TEXT PRIMARY KEY,
       applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`
  );

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

/**
 * Refuse to migrate a database that another application also lives in.
 *
 * Migrations here drop and recreate generically named tables (`sessions`,
 * `accounts`, `users`). Run against a co-tenanted database, one of those
 * DROPs destroys somebody else's data — and because this runner is pointed
 * at production by default, there is no rehearsal step to catch it.
 *
 * Override with `npm run db:migrate -- --shared-db` when the co-tenancy is
 * known and intended.
 */
async function assertNotCoTenanted(client, files) {
  const sqlTexts = await Promise.all(
    files.map((f) => readFile(path.join(migrationsDir, f), "utf8"))
  );

  const { rows: publicRows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );
  const { rows: allRows } = await client.query(
    `SELECT schemaname, tablename FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')`
  );

  const { shared, foreignTables, foreignJournals } = assessTenancy({
    ownTables: tablesCreatedByMigrations(sqlTexts),
    publicTables: publicRows.map((r) => r.tablename),
    allTables: allRows.map((r) => ({
      schema: r.schemaname,
      table: r.tablename,
    })),
  });

  if (!shared) return;

  const allowed =
    process.argv.includes("--shared-db") ||
    process.env.TELESCOPE_ALLOW_SHARED_DB === "1";

  console.error("\n⚠ This database is shared with something else.");
  if (foreignJournals.length) {
    console.error(
      `  Another migration tool manages it: ${foreignJournals.join(", ")}`
    );
  }
  if (foreignTables.length) {
    const shown = foreignTables.slice(0, 12).join(", ");
    const more =
      foreignTables.length > 12 ? ` (+${foreignTables.length - 12} more)` : "";
    console.error(`  Tables no migration here creates: ${shown}${more}`);
  }

  if (allowed) {
    console.error("  Proceeding anyway — --shared-db was passed.\n");
    return;
  }

  console.error(
    "\n  Refusing to run. These migrations DROP generically named tables,\n" +
      "  and this runner writes straight to production.\n" +
      "  If this is expected: npm run db:migrate -- --shared-db\n"
  );
  await client.end();
  process.exit(1);
}
