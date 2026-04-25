export type PlayMode = "running" | "paused";

export const SPEED_OPTIONS = [1, 60, 3600] as const;
export type SpeedMultiplier = (typeof SPEED_OPTIONS)[number];

export interface TimeState {
  mode: PlayMode;
  speed: SpeedMultiplier;
  anchorReal: number;
  anchorVirtual: number;
}

export interface TimeSnapshot {
  mode: PlayMode;
  speed: SpeedMultiplier;
  virtualMs: number;
}
