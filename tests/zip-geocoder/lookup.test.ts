import { describe, expect, it } from "vitest";
import { buildZipDatabase, lookupZip } from "@/lib/zip-geocoder";

const FIXTURES = [
  { zip: "55401", lat: 44.9833, lng: -93.2706, city: "Minneapolis", state: "MN" },
  { zip: "10001", lat: 40.7506, lng: -73.9971, city: "New York", state: "NY" },
  { zip: "01002", lat: 42.3851, lng: -72.5148, city: "Amherst", state: "MA" },
];

describe("lookupZip", () => {
  const db = buildZipDatabase(FIXTURES);

  it("resolves a known 5-digit zip", () => {
    expect(lookupZip("55401", db)).toEqual(FIXTURES[0]);
  });

  it("resolves a ZIP+4 form", () => {
    expect(lookupZip("55401-1234", db)).toEqual(FIXTURES[0]);
  });

  it("preserves leading-zero zips", () => {
    expect(lookupZip("01002", db)?.state).toBe("MA");
  });

  it("returns null for an unknown zip", () => {
    expect(lookupZip("99999", db)).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(lookupZip("abc", db)).toBeNull();
    expect(lookupZip("", db)).toBeNull();
    expect(lookupZip("1234", db)).toBeNull();
  });
});

describe("buildZipDatabase", () => {
  it("keys entries by zip", () => {
    const db = buildZipDatabase(FIXTURES);
    expect(db.size).toBe(3);
    expect(db.has("10001")).toBe(true);
  });
});
