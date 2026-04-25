import type {
  PlayMode,
  SpeedMultiplier,
  TimeState,
} from "./types";
import { SPEED_OPTIONS } from "./types";

export function virtualAt(state: TimeState, realNow: number): number {
  if (state.mode === "paused") return state.anchorVirtual;
  return state.anchorVirtual + (realNow - state.anchorReal) * state.speed;
}

export function initialState(realNow: number): TimeState {
  return {
    mode: "running",
    speed: 1,
    anchorReal: realNow,
    anchorVirtual: realNow,
  };
}

function rebase(state: TimeState, realNow: number, patch: Partial<TimeState>): TimeState {
  return {
    ...state,
    anchorVirtual: virtualAt(state, realNow),
    anchorReal: realNow,
    ...patch,
  };
}

export function play(state: TimeState, realNow: number): TimeState {
  if (state.mode === "running") return state;
  return rebase(state, realNow, { mode: "running" });
}

export function pause(state: TimeState, realNow: number): TimeState {
  if (state.mode === "paused") return state;
  return rebase(state, realNow, { mode: "paused" });
}

export function isValidSpeed(speed: number): speed is SpeedMultiplier {
  return (SPEED_OPTIONS as readonly number[]).includes(speed);
}

export function setSpeed(
  state: TimeState,
  speed: SpeedMultiplier,
  realNow: number
): TimeState {
  if (state.speed === speed) return state;
  return rebase(state, realNow, { speed });
}

export function scrubTo(
  state: TimeState,
  virtualMs: number,
  realNow: number
): TimeState {
  return {
    ...state,
    anchorReal: realNow,
    anchorVirtual: virtualMs,
  };
}

export function reset(state: TimeState, realNow: number): TimeState {
  return {
    mode: state.mode,
    speed: state.speed,
    anchorReal: realNow,
    anchorVirtual: realNow,
  };
}

export function togglePlay(state: TimeState, realNow: number): TimeState {
  return state.mode === "running" ? pause(state, realNow) : play(state, realNow);
}

export type { PlayMode };
