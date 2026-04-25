import { describe, expect, it } from "vitest";
import {
  initialState,
  isValidSpeed,
  pause,
  play,
  reset,
  scrubTo,
  setSpeed,
  togglePlay,
  virtualAt,
} from "@/lib/time-controller";

const T0 = 1_700_000_000_000; // 2023-11-14T22:13:20Z — arbitrary fixed epoch

describe("time-controller reducer", () => {
  it("initializes at real-now, running, 1x", () => {
    const s = initialState(T0);
    expect(s.mode).toBe("running");
    expect(s.speed).toBe(1);
    expect(virtualAt(s, T0)).toBe(T0);
  });

  it("advances virtual time at 1x while running", () => {
    const s = initialState(T0);
    expect(virtualAt(s, T0 + 5_000)).toBe(T0 + 5_000);
  });

  it("advances virtual time at 60x while running", () => {
    const s = setSpeed(initialState(T0), 60, T0);
    // 1 real second → 60 virtual seconds
    expect(virtualAt(s, T0 + 1_000)).toBe(T0 + 60_000);
  });

  it("advances virtual time at 3600x while running", () => {
    const s = setSpeed(initialState(T0), 3600, T0);
    // 1 real second → 3600 virtual seconds (1 virtual hour)
    expect(virtualAt(s, T0 + 1_000)).toBe(T0 + 3_600_000);
  });

  it("pause freezes virtual time", () => {
    const running = setSpeed(initialState(T0), 60, T0);
    const paused = pause(running, T0 + 2_000);
    expect(paused.mode).toBe("paused");
    // Frozen at the value it had when paused
    expect(virtualAt(paused, T0 + 2_000)).toBe(T0 + 120_000);
    expect(virtualAt(paused, T0 + 999_999)).toBe(T0 + 120_000);
  });

  it("play from paused resumes without jumping virtual time", () => {
    const running = setSpeed(initialState(T0), 60, T0);
    const paused = pause(running, T0 + 2_000);
    const resumed = play(paused, T0 + 10_000); // paused for 8s real
    expect(resumed.mode).toBe("running");
    // No jump: virtual should still be at the paused value at the instant of resume
    expect(virtualAt(resumed, T0 + 10_000)).toBe(T0 + 120_000);
    // Then continues at 60x
    expect(virtualAt(resumed, T0 + 11_000)).toBe(T0 + 180_000);
  });

  it("play when already running is a no-op", () => {
    const s = initialState(T0);
    expect(play(s, T0 + 100)).toBe(s);
  });

  it("pause when already paused is a no-op", () => {
    const s = pause(initialState(T0), T0);
    expect(pause(s, T0 + 500)).toBe(s);
  });

  it("setSpeed preserves continuous virtual time", () => {
    const s1 = initialState(T0);
    const atChange = T0 + 2_000; // +2s real, virtual = T0+2s at 1x
    const s2 = setSpeed(s1, 60, atChange);
    expect(virtualAt(s2, atChange)).toBe(T0 + 2_000);
    // After the change: 1 more real sec at 60x → +60s virtual
    expect(virtualAt(s2, atChange + 1_000)).toBe(T0 + 2_000 + 60_000);
  });

  it("setSpeed while paused preserves frozen virtual time", () => {
    const paused = pause(initialState(T0), T0 + 1_000);
    const frozen = virtualAt(paused, T0 + 1_000);
    const changed = setSpeed(paused, 3600, T0 + 5_000);
    expect(changed.mode).toBe("paused");
    expect(virtualAt(changed, T0 + 5_000)).toBe(frozen);
  });

  it("setSpeed is a no-op when speed matches", () => {
    const s = initialState(T0);
    expect(setSpeed(s, 1, T0 + 100)).toBe(s);
  });

  it("scrubTo jumps virtual time and preserves mode", () => {
    const s = initialState(T0);
    const jumped = scrubTo(s, T0 + 86_400_000, T0 + 500); // one day ahead
    expect(jumped.mode).toBe("running");
    expect(virtualAt(jumped, T0 + 500)).toBe(T0 + 86_400_000);
    // Then continues forward at 1x
    expect(virtualAt(jumped, T0 + 1_500)).toBe(T0 + 86_400_000 + 1_000);
  });

  it("scrubTo while paused holds the scrubbed time", () => {
    const paused = pause(initialState(T0), T0 + 1_000);
    const jumped = scrubTo(paused, T0 + 123_456, T0 + 5_000);
    expect(jumped.mode).toBe("paused");
    expect(virtualAt(jumped, T0 + 9_999)).toBe(T0 + 123_456);
  });

  it("reset snaps virtual to real-now while preserving speed and mode", () => {
    const scrubbed = scrubTo(
      setSpeed(initialState(T0), 3600, T0),
      T0 + 1_000_000,
      T0 + 100
    );
    const r = reset(scrubbed, T0 + 200);
    expect(r.mode).toBe("running");
    expect(r.speed).toBe(3600);
    expect(virtualAt(r, T0 + 200)).toBe(T0 + 200);
  });

  it("togglePlay flips mode without jumping virtual time", () => {
    const s1 = initialState(T0);
    const paused = togglePlay(s1, T0 + 3_000); // running → paused
    expect(paused.mode).toBe("paused");
    expect(virtualAt(paused, T0 + 3_000)).toBe(T0 + 3_000);
    const running = togglePlay(paused, T0 + 10_000);
    expect(running.mode).toBe("running");
    // still at the paused value at the instant of resume
    expect(virtualAt(running, T0 + 10_000)).toBe(T0 + 3_000);
  });

  it("isValidSpeed accepts 1/60/3600 only", () => {
    expect(isValidSpeed(1)).toBe(true);
    expect(isValidSpeed(60)).toBe(true);
    expect(isValidSpeed(3600)).toBe(true);
    expect(isValidSpeed(2)).toBe(false);
    expect(isValidSpeed(0)).toBe(false);
    expect(isValidSpeed(-1)).toBe(false);
  });
});
