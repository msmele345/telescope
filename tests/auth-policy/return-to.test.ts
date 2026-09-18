import { describe, expect, it } from "vitest";
import { DEFAULT_RETURN_TO, loginHref, safeReturnTo } from "@/lib/auth-policy";

describe("safeReturnTo", () => {
  it("defaults to the sky map", () => {
    expect(DEFAULT_RETURN_TO).toBe("/");
  });

  it("accepts a relative path", () => {
    expect(safeReturnTo("/constellations/orion")).toBe("/constellations/orion");
  });

  it("keeps the query string and hash of a relative path", () => {
    expect(safeReturnTo("/?star=424")).toBe("/?star=424");
    expect(safeReturnTo("/constellations/orion#myth")).toBe(
      "/constellations/orion#myth"
    );
  });

  it.each([
    ["an absolute URL", "https://evil.example/phish"],
    ["a protocol-relative URL", "//evil.example/phish"],
    ["a backslash-smuggled host", "/\\evil.example"],
    ["a tab-smuggled host", "/\t/evil.example"],
    ["a newline-smuggled host", "/\n/evil.example"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a path without a leading slash", "constellations/orion"],
    ["an empty string", ""],
  ])("discards %s in favour of the default", (_label, value) => {
    expect(safeReturnTo(value)).toBe("/");
  });

  it("discards anything that is not a single string", () => {
    expect(safeReturnTo(undefined)).toBe("/");
    expect(safeReturnTo(null)).toBe("/");
    expect(safeReturnTo(["/a", "/b"])).toBe("/");
    expect(safeReturnTo(42)).toBe("/");
  });

  it("does not send a freshly signed-in visitor back to the login page", () => {
    expect(safeReturnTo("/login")).toBe("/");
    expect(safeReturnTo("/login?returnTo=%2Fprofile")).toBe("/");
  });
});

describe("loginHref", () => {
  it("links to the bare login page when there is nowhere to return to", () => {
    expect(loginHref()).toBe("/login");
    expect(loginHref(null)).toBe("/login");
    expect(loginHref("/")).toBe("/login");
  });

  it("carries a destination as an encoded returnTo parameter", () => {
    expect(loginHref("/constellations/orion")).toBe(
      "/login?returnTo=%2Fconstellations%2Forion"
    );
    expect(loginHref("/?star=424")).toBe("/login?returnTo=%2F%3Fstar%3D424");
  });

  it("round-trips its destination through safeReturnTo", () => {
    const href = loginHref("/?star=424");
    const param = new URL(href, "http://x").searchParams.get("returnTo");
    expect(safeReturnTo(param)).toBe("/?star=424");
  });

  it("drops an off-site destination rather than advertising it", () => {
    expect(loginHref("https://evil.example")).toBe("/login");
  });
});
