import { describe, expect, it } from "vitest";
import { formatDecShort, formatRAShort } from "@/lib/constellation/coords";

describe("constellation/coords", () => {
  it("formats RA at 0 radians as 00h 00m", () => {
    expect(formatRAShort(0)).toBe("00h 00m");
  });

  it("formats RA at π as 12h 00m", () => {
    expect(formatRAShort(Math.PI)).toBe("12h 00m");
  });

  it("formats RA close to 2π as 00h 00m (wraps)", () => {
    expect(formatRAShort(2 * Math.PI)).toBe("00h 00m");
  });

  it("formats Dec at 0 as +0°", () => {
    expect(formatDecShort(0)).toBe("+0°");
  });

  it("formats Dec at +π/2 as +90°", () => {
    expect(formatDecShort(Math.PI / 2)).toBe("+90°");
  });

  it("formats Dec at −π/2 as −90° using a true minus sign", () => {
    expect(formatDecShort(-Math.PI / 2)).toBe("−90°");
  });
});
