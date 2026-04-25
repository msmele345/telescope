import {
  initialState,
  pause,
  play,
  reset,
  scrubTo,
  setSpeed,
  togglePlay,
  virtualAt,
} from "./reducer";
import type { SpeedMultiplier, TimeSnapshot, TimeState } from "./types";

type Listener = (snapshot: TimeSnapshot) => void;

export interface TimeControllerOptions {
  /** Real-time clock source, ms. Overridable for tests. */
  now?: () => number;
  /** Initial virtual time override. Defaults to real now. */
  initialVirtualMs?: number;
}

export class TimeController {
  private state: TimeState;
  private readonly listeners = new Set<Listener>();
  private readonly now: () => number;

  constructor(options: TimeControllerOptions = {}) {
    this.now = options.now ?? Date.now;
    const real = this.now();
    const base = initialState(real);
    this.state =
      options.initialVirtualMs !== undefined
        ? { ...base, anchorVirtual: options.initialVirtualMs }
        : base;
  }

  getState(): TimeState {
    return this.state;
  }

  snapshot(realNow = this.now()): TimeSnapshot {
    return {
      mode: this.state.mode,
      speed: this.state.speed,
      virtualMs: virtualAt(this.state, realNow),
    };
  }

  getVirtualMs(realNow = this.now()): number {
    return virtualAt(this.state, realNow);
  }

  play(): void {
    this.apply(play(this.state, this.now()));
  }

  pause(): void {
    this.apply(pause(this.state, this.now()));
  }

  togglePlay(): void {
    this.apply(togglePlay(this.state, this.now()));
  }

  setSpeed(speed: SpeedMultiplier): void {
    this.apply(setSpeed(this.state, speed, this.now()));
  }

  scrubTo(virtualMs: number): void {
    this.apply(scrubTo(this.state, virtualMs, this.now()));
  }

  reset(): void {
    this.apply(reset(this.state, this.now()));
  }

  /** Emit a tick snapshot without changing state — used by the RAF loop. */
  tick(): TimeSnapshot {
    const snap = this.snapshot();
    this.emit(snap);
    return snap;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private apply(next: TimeState): void {
    if (next === this.state) return;
    this.state = next;
    this.emit(this.snapshot());
  }

  private emit(snap: TimeSnapshot): void {
    for (const listener of this.listeners) listener(snap);
  }
}
