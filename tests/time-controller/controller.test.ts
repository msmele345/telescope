import { describe, expect, it, vi } from "vitest";
import { TimeController } from "@/lib/time-controller";

const T0 = 1_700_000_000_000;

function fakeClock(start: number) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
    set: (ms: number) => {
      t = ms;
    },
  };
}

describe("TimeController", () => {
  it("defaults to running at 1x at real-now", () => {
    const clock = fakeClock(T0);
    const c = new TimeController({ now: clock.now });
    const snap = c.snapshot();
    expect(snap.mode).toBe("running");
    expect(snap.speed).toBe(1);
    expect(snap.virtualMs).toBe(T0);
  });

  it("emits current snapshot to a new subscriber", () => {
    const clock = fakeClock(T0);
    const c = new TimeController({ now: clock.now });
    const listener = vi.fn();
    c.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({
      mode: "running",
      speed: 1,
      virtualMs: T0,
    });
  });

  it("notifies subscribers on state transitions", () => {
    const clock = fakeClock(T0);
    const c = new TimeController({ now: clock.now });
    const listener = vi.fn();
    c.subscribe(listener);
    listener.mockClear();

    clock.advance(1_000);
    c.pause();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].mode).toBe("paused");

    clock.advance(5_000);
    c.setSpeed(60);
    expect(listener).toHaveBeenCalledTimes(2);

    c.play();
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener.mock.calls[2][0].mode).toBe("running");
  });

  it("unsubscribe stops further notifications", () => {
    const clock = fakeClock(T0);
    const c = new TimeController({ now: clock.now });
    const listener = vi.fn();
    const unsub = c.subscribe(listener);
    listener.mockClear();

    unsub();
    c.pause();
    c.setSpeed(60);
    expect(listener).not.toHaveBeenCalled();
  });

  it("tick emits a snapshot without mutating state", () => {
    const clock = fakeClock(T0);
    const c = new TimeController({ now: clock.now });
    c.setSpeed(60);
    const listener = vi.fn();
    c.subscribe(listener);
    listener.mockClear();

    clock.advance(1_000);
    c.tick();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].virtualMs).toBe(T0 + 60_000);
    // state untouched: another tick at the same real time still reports same virtual
    c.tick();
    expect(listener.mock.calls[1][0].virtualMs).toBe(T0 + 60_000);
  });

  it("scrubTo jumps virtual time", () => {
    const clock = fakeClock(T0);
    const c = new TimeController({ now: clock.now });
    c.scrubTo(T0 + 86_400_000);
    expect(c.getVirtualMs()).toBe(T0 + 86_400_000);
  });

  it("reset returns virtual to real-now", () => {
    const clock = fakeClock(T0);
    const c = new TimeController({ now: clock.now });
    c.scrubTo(T0 + 86_400_000);
    clock.advance(5_000);
    c.reset();
    expect(c.getVirtualMs()).toBe(T0 + 5_000);
  });

  it("togglePlay flips between running and paused", () => {
    const clock = fakeClock(T0);
    const c = new TimeController({ now: clock.now });
    expect(c.snapshot().mode).toBe("running");
    c.togglePlay();
    expect(c.snapshot().mode).toBe("paused");
    c.togglePlay();
    expect(c.snapshot().mode).toBe("running");
  });

  it("accepts initialVirtualMs override", () => {
    const clock = fakeClock(T0);
    const c = new TimeController({
      now: clock.now,
      initialVirtualMs: 42,
    });
    expect(c.getVirtualMs()).toBe(42);
  });
});
