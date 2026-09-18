import { describe, expect, it } from "vitest";
import {
  assessTenancy,
  tablesCreatedByMigrations,
  RUNNER_TABLE,
} from "@/scripts/lib/db-guardrail.mjs";

describe("tablesCreatedByMigrations", () => {
  it("picks up plain and IF NOT EXISTS forms, and the runner's own table", () => {
    const names = tablesCreatedByMigrations([
      "CREATE TABLE sessions (\n  token_hash CHAR(64) PRIMARY KEY\n);",
      "CREATE TABLE IF NOT EXISTS favorites (\n  user_id INTEGER\n);",
    ]);
    expect(names.has("sessions")).toBe(true);
    expect(names.has("favorites")).toBe(true);
    expect(names.has(RUNNER_TABLE)).toBe(true);
  });

  it("reads quoted names and ignores case", () => {
    const names = tablesCreatedByMigrations([`create table "Users" (id serial);`]);
    expect(names.has("users")).toBe(true);
  });

  it("is not fooled by DROP TABLE or by a table named in a reference", () => {
    const names = tablesCreatedByMigrations([
      `DROP TABLE IF EXISTS accounts;
       CREATE TABLE sessions (
         user_id INTEGER REFERENCES users(id)
       );`,
    ]);
    expect(names.has("sessions")).toBe(true);
    expect(names.has("accounts")).toBe(false);
    // `users` is only referenced here, not created — a different migration
    // creates it, and this function is always given the whole set.
    expect(names.has("users")).toBe(false);
  });
});

describe("assessTenancy", () => {
  const ownTables = new Set(["users", "sessions", "login_codes", "_migrations"]);

  it("reports a database holding only our own tables as not shared", () => {
    const result = assessTenancy({
      ownTables,
      publicTables: ["users", "sessions", "login_codes", "_migrations"],
      allTables: [{ schema: "public", table: "users" }],
    });
    expect(result.shared).toBe(false);
    expect(result.foreignTables).toEqual([]);
    expect(result.foreignJournals).toEqual([]);
  });

  it("treats a brand-new empty database as not shared", () => {
    const result = assessTenancy({
      ownTables,
      publicTables: [],
      allTables: [],
    });
    expect(result.shared).toBe(false);
  });

  it("flags tables in public that our migrations never create", () => {
    const result = assessTenancy({
      ownTables,
      publicTables: ["users", "artists", "venues"],
      allTables: [],
    });
    expect(result.shared).toBe(true);
    expect(result.foreignTables).toEqual(["artists", "venues"]);
  });

  it("flags another tool's migration journal even in a separate schema", () => {
    const result = assessTenancy({
      ownTables,
      publicTables: ["users"],
      allTables: [{ schema: "drizzle", table: "__drizzle_migrations" }],
    });
    expect(result.shared).toBe(true);
    expect(result.foreignJournals).toEqual(["drizzle.__drizzle_migrations"]);
  });

  it("does not mistake our own journal for a foreign one", () => {
    const result = assessTenancy({
      ownTables,
      publicTables: ["_migrations"],
      allTables: [{ schema: "public", table: "_migrations" }],
    });
    expect(result.shared).toBe(false);
  });
});
