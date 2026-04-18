import { describe, expect, it } from "vitest";
import { normalizeZip } from "@/lib/zip-geocoder";

describe("normalizeZip", () => {
  it("accepts a 5-digit zipcode", () => {
    expect(normalizeZip("55401")).toBe("55401");
  });

  it("preserves leading zeros", () => {
    expect(normalizeZip("01002")).toBe("01002");
  });

  it("strips the ZIP+4 suffix", () => {
    expect(normalizeZip("55401-1234")).toBe("55401");
  });

  it("tolerates surrounding whitespace", () => {
    expect(normalizeZip("  55401 ")).toBe("55401");
  });

  it("rejects 4-digit input", () => {
    expect(normalizeZip("5540")).toBeNull();
  });

  it("rejects 6-digit input", () => {
    expect(normalizeZip("554010")).toBeNull();
  });

  it("rejects ZIP+3", () => {
    expect(normalizeZip("55401-123")).toBeNull();
  });

  it("rejects non-digits", () => {
    expect(normalizeZip("abcde")).toBeNull();
    expect(normalizeZip("55401a")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(normalizeZip("")).toBeNull();
  });

  it("rejects non-string values defensively", () => {
    // @ts-expect-error — contract allows defense at the boundary
    expect(normalizeZip(null)).toBeNull();
    // @ts-expect-error
    expect(normalizeZip(undefined)).toBeNull();
    // @ts-expect-error
    expect(normalizeZip(55401)).toBeNull();
  });
});
