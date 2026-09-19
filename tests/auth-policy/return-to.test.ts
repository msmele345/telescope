import { describe, expect, it } from "vitest";
import { loginHref, safeReturnTo } from "@/lib/auth-policy";

describe("safeReturnTo", () => {
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
    // Dot-segments collapse during parsing into a protocol-relative path.
    ["a dot-segment-smuggled host", "/..//evil.example"],
    ["a single-dot-smuggled host", "/.//evil.example"],
    ["an encoded-dot-smuggled host", "/%2e%2e//evil.example"],
    ["a nested-dot-smuggled host", "/a/..//evil.example"],
    ["a dot-segment-smuggled backslash host", "/..\\/evil.example"],
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

describe("safeReturnTo never yields an off-site destination", () => {
  const SITE = "https://telescope.example";
  const prefixes = ["/", "/a/", "/./", "/../", "/%2e%2e/", "/%2E/", "/a/../"];
  const middles = ["", "/", "\\", "\t", "\n", " ", "./", "../", "%2f", "%5c"];
  const hosts = ["evil.example", "/evil.example", "\\evil.example", "@evil.example"];

  it("keeps every combination of smuggling tricks on the site's own origin", () => {
    for (const p of prefixes) {
      for (const m of middles) {
        for (const h of hosts) {
          const raw = p + m + h;
          const out = safeReturnTo(raw);
          // As a browser would resolve the Location header we send.
          expect(new URL(out, SITE).origin, JSON.stringify(raw)).toBe(SITE);
          expect(out.startsWith("/") && !out.startsWith("//")).toBe(true);
        }
      }
    }
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
