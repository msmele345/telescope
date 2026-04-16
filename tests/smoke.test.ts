import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("runs vitest with jsdom environment", () => {
    expect(typeof window).toBe("object");
    expect(document.createElement("div")).toBeDefined();
  });
});
