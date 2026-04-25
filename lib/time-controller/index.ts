export type {
  PlayMode,
  SpeedMultiplier,
  TimeSnapshot,
  TimeState,
} from "./types";
export { SPEED_OPTIONS } from "./types";
export {
  initialState,
  pause,
  play,
  reset,
  scrubTo,
  setSpeed,
  togglePlay,
  virtualAt,
  isValidSpeed,
} from "./reducer";
export { TimeController } from "./controller";
export type { TimeControllerOptions } from "./controller";
