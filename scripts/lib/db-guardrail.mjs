/**
 * Pure helpers for the migration runner's co-tenancy preflight.
 *
 * Telescope's Postgres once sat in an instance shared with a second,
 * unrelated application in the same `public` schema — which meant a migration
 * dropping a generically named table (`sessions`, `users`, `accounts`) could
 * destroy someone else's data. It now has its own Neon project, but the runner
 * still writes to whatever `.env.local` names, so these helpers stay as a
 * standing check: detect co-tenancy so the runner can refuse.
 *
 * No database access in here, so the logic is testable on its own.
 */

// Tolerates `CREATE TABLE x`, `CREATE TABLE IF NOT EXISTS x`, and quoted names.
const CREATE_TABLE =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gi;

/** The bookkeeping table the runner itself creates. */
export const RUNNER_TABLE = "_migrations";

/**
 * Table names this project's own migrations create, derived from the SQL
 * rather than hardcoded, so the list cannot drift as migrations are added.
 */
export function tablesCreatedByMigrations(sqlTexts) {
  const names = new Set([RUNNER_TABLE]);
  for (const sql of sqlTexts) {
    for (const match of sql.matchAll(CREATE_TABLE)) {
      names.add(match[1].toLowerCase());
    }
  }
  return names;
}

/**
 * Migration bookkeeping tables belonging to other tools. Finding one means
 * something other than this runner also manages the database — the highest
 * confidence signal of co-tenancy, and it needs no list of our own tables.
 */
export const FOREIGN_MIGRATION_JOURNALS = [
  "__drizzle_migrations",
  "_prisma_migrations",
  "schema_migrations",
  "knex_migrations",
  "flyway_schema_history",
  "alembic_version",
  "atlas_schema_revisions",
  "sequelizemeta",
  "goose_db_version",
  "_sqlx_migrations",
];

/**
 * Decide whether the target database looks like it belongs to this project
 * alone.
 *
 * @param {object} input
 * @param {Set<string>} input.ownTables      lowercased names our migrations create
 * @param {string[]}    input.publicTables   table names found in the public schema
 * @param {{schema: string, table: string}[]} input.allTables every non-system table
 * @returns {{shared: boolean, foreignTables: string[], foreignJournals: string[]}}
 */
export function assessTenancy({ ownTables, publicTables, allTables }) {
  const foreignTables = publicTables
    .filter((table) => !ownTables.has(table.toLowerCase()))
    .sort();

  const foreignJournals = allTables
    .filter(({ table }) =>
      FOREIGN_MIGRATION_JOURNALS.includes(table.toLowerCase())
    )
    .map(({ schema, table }) => `${schema}.${table}`)
    .sort();

  return {
    shared: foreignTables.length > 0 || foreignJournals.length > 0,
    foreignTables,
    foreignJournals,
  };
}
