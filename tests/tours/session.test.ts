import { describe, expect, it } from "vitest";
import { TimeController } from "@/lib/time-controller";
import { enterTourTime, leaveTourTime, returnsToNow } from "@/lib/tours";

const T0 = Date.UTC(2026, 10, 17, 18, 0); // 2026-11-17 18:00Z
const MINUTE = 60_000;
const TOUR_AT = new Date(Date.UTC(2026, 11, 8, 4, 30));

function fakeClock(start = T0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("enterTourTime", () => {
  it("pauses the controller at the tour time", () => {
    const clock = fakeClock();
    const controller = new TimeController({ now: clock.now });
    enterTourTime(controller, TOUR_AT);
    expect(controller.snapshot().mode).toBe("paused");
    expect(controller.getVirtualMs()).toBe(TOUR_AT.getTime());
    clock.advance(10 * MINUTE);
    expect(controller.getVirtualMs()).toBe(TOUR_AT.getTime());
  });

  it("remembers the play mode, speed and offset from real time", () => {
    const clock = fakeClock();
    const controller = new TimeController({ now: clock.now });
    controller.setSpeed(60);
    controller.scrubTo(T0 + 3 * 60 * MINUTE);
    expect(enterTourTime(controller, TOUR_AT)).toEqual({
      mode: "running",
      speed: 60,
      offsetMs: 3 * 60 * MINUTE,
    });
  });
});

describe("leaveTourTime", () => {
  it("brings a live map back live, with the clock advanced during the tour", () => {
    const clock = fakeClock();
    const controller = new TimeController({ now: clock.now });
    const saved = enterTourTime(controller, TOUR_AT);
    clock.advance(25 * MINUTE);
    leaveTourTime(controller, saved);
    expect(controller.snapshot()).toMatchObject({ mode: "running", speed: 1 });
    expect(controller.getVirtualMs()).toBe(T0 + 25 * MINUTE);
    clock.advance(MINUTE);
    expect(controller.getVirtualMs()).toBe(T0 + 26 * MINUTE);
  });

  it("restores a paused map's speed and offset, still paused", () => {
    const clock = fakeClock();
    const controller = new TimeController({ now: clock.now });
    controller.setSpeed(3600);
    controller.pause();
    controller.scrubTo(T0 - 2 * 60 * MINUTE);
    const saved = enterTourTime(controller, TOUR_AT);
    clock.advance(5 * MINUTE);
    leaveTourTime(controller, saved);
    expect(controller.snapshot()).toMatchObject({ mode: "paused", speed: 3600 });
    expect(controller.getVirtualMs()).toBe(T0 + 5 * MINUTE - 2 * 60 * MINUTE);
  });
});

describe("returnsToNow", () => {
  it("is true for an offset under a minute either way", () => {
    expect(returnsToNow({ mode: "running", speed: 1, offsetMs: 0 })).toBe(true);
    expect(returnsToNow({ mode: "running", speed: 1, offsetMs: 59_999 })).toBe(true);
    expect(returnsToNow({ mode: "paused", speed: 1, offsetMs: -59_999 })).toBe(true);
  });

  it("is false for an offset of a minute or more", () => {
    expect(returnsToNow({ mode: "running", speed: 1, offsetMs: MINUTE })).toBe(false);
    expect(returnsToNow({ mode: "running", speed: 1, offsetMs: -MINUTE })).toBe(false);
  });
});
