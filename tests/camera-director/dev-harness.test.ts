import { describe, expect, it } from "vitest";
import { POINT_FOV, parseLookAt } from "@/lib/camera-director";

describe("parseLookAt (dev harness)", () => {
  it("reads a Messier ID", () => {
    expect(parseLookAt("M42")).toEqual({ kind: "messier", id: "M42" });
    expect(parseLookAt("m45")).toEqual({ kind: "messier", id: "M45" });
  });

  it("reads a BSC star ID", () => {
    expect(parseLookAt("7001")).toEqual({ kind: "star", id: 7001 });
  });

  it("reads an IAU constellation abbreviation as given", () => {
    expect(parseLookAt("Ori")).toEqual({ kind: "constellation", id: "Ori" });
    expect(parseLookAt("UMa")).toEqual({ kind: "constellation", id: "UMa" });
  });

  it("reads a raw altitude,azimuth in degrees at star zoom", () => {
    expect(parseLookAt("89.3,180")).toEqual({ kind: "horizontal", alt: 89.3, az: 180, fov: POINT_FOV });
    expect(parseLookAt("-5,270.5")).toEqual({ kind: "horizontal", alt: -5, az: 270.5, fov: POINT_FOV });
  });

  it("treats a missing, empty, reset or unreadable value as no target", () => {
    expect(parseLookAt(null)).toBeNull();
    expect(parseLookAt("")).toBeNull();
    expect(parseLookAt("reset")).toBeNull();
    expect(parseLookAt("not a target")).toBeNull();
    expect(parseLookAt("95,10")).toBeNull();
  });
});
