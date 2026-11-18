import type { PlayMode, SpeedMultiplier, TimeController } from "@/lib/time-controller";

/**
 * The time state a tour replaces, kept so "Return" can put it back. The
 * offset from real time is kept rather than the absolute virtual time, so a
 * map that was running live comes back live instead of behind by the length
 * of the tour.
 */
export interface SavedTime {
  mode: PlayMode;
  speed: SpeedMultiplier;
  /** Virtual minus real, ms. */
  offsetMs: number;
}

/** Under this, "Return" reads "Return to now". */
const NOW_TOLERANCE_MS = 60_000;

/** Pause the controller at the tour time, and return what it was doing before. */
export function enterTourTime(controller: TimeController, at: Date): SavedTime {
  const realNow = controller.getRealMs();
  const { mode, speed, virtualMs } = controller.snapshot(realNow);
  controller.pause();
  controller.scrubTo(at.getTime());
  return { mode, speed, offsetMs: virtualMs - realNow };
}

/** Restore the play mode and speed, at real now plus the remembered offset. */
export function leaveTourTime(controller: TimeController, saved: SavedTime): void {
  controller.setSpeed(saved.speed);
  controller.scrubTo(controller.getRealMs() + saved.offsetMs);
  if (saved.mode === "running") controller.play();
  else controller.pause();
}

/** Whether "Return" goes back to (about) the present. */
export function returnsToNow(saved: SavedTime): boolean {
  return Math.abs(saved.offsetMs) < NOW_TOLERANCE_MS;
}
