"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SPEED_OPTIONS,
  TimeController,
  type SpeedMultiplier,
  type TimeSnapshot,
} from "@/lib/time-controller";

export interface TimeScrubberProps {
  controller: TimeController;
}

const SPEED_LABELS: Record<SpeedMultiplier, string> = {
  1: "1×",
  60: "60×",
  3600: "3600×",
};

export default function TimeScrubber({ controller }: TimeScrubberProps) {
  const [snapshot, setSnapshot] = useState<TimeSnapshot>(() =>
    controller.snapshot()
  );

  useEffect(() => {
    return controller.subscribe(setSnapshot);
  }, [controller]);

  // RAF loop: while running, re-read virtual time every frame so the
  // date/time readout updates smoothly without mutating controller state.
  useEffect(() => {
    if (snapshot.mode !== "running") return;
    let raf = 0;
    const loop = () => {
      setSnapshot(controller.snapshot());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [controller, snapshot.mode]);

  const virtualDate = useMemo(
    () => new Date(snapshot.virtualMs),
    [snapshot.virtualMs]
  );

  const handleTogglePlay = useCallback(() => {
    controller.togglePlay();
  }, [controller]);

  const handleSpeed = useCallback(
    (speed: SpeedMultiplier) => {
      controller.setSpeed(speed);
    },
    [controller]
  );

  const handleReset = useCallback(() => {
    controller.reset();
  }, [controller]);

  const handlePick = useCallback(
    (value: string) => {
      // datetime-local returns local-time strings without zone.
      // Treat them as local and convert to ms.
      const ms = parseLocalDateTime(value);
      if (ms !== null) controller.scrubTo(ms);
    },
    [controller]
  );

  const isPlaying = snapshot.mode === "running";

  return (
    <div style={rootStyle} role="group" aria-label="Time controls">
      <button
        type="button"
        onClick={handleTogglePlay}
        style={playButtonStyle}
        aria-label={isPlaying ? "Pause" : "Play"}
        aria-pressed={isPlaying}
      >
        {isPlaying ? "❚❚" : "▶"}
      </button>

      <div style={speedGroupStyle} role="radiogroup" aria-label="Playback speed">
        {SPEED_OPTIONS.map((speed) => {
          const selected = snapshot.speed === speed;
          return (
            <button
              key={speed}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSpeed(speed)}
              style={{
                ...speedButtonStyle,
                ...(selected ? speedButtonSelectedStyle : null),
              }}
            >
              {SPEED_LABELS[speed]}
            </button>
          );
        })}
      </div>

      <DateTimePicker value={virtualDate} onChange={handlePick} />

      <button
        type="button"
        onClick={handleReset}
        style={nowButtonStyle}
        aria-label="Reset to now"
      >
        Now
      </button>

      <span style={readoutStyle} aria-live="off">
        {formatUtcLabel(virtualDate)}
      </span>
    </div>
  );
}

interface DateTimePickerProps {
  value: Date;
  onChange: (value: string) => void;
}

function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const displayed = useMemo(() => toLocalInputValue(value), [value]);
  // Keep an internal buffer so rapid RAF-driven updates to the readout don't
  // fight the user mid-edit.
  const [buffer, setBuffer] = useState(displayed);
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) setBuffer(displayed);
  }, [displayed]);

  return (
    <input
      type="datetime-local"
      aria-label="Pick date and time"
      value={buffer}
      step={1}
      onFocus={() => {
        editingRef.current = true;
      }}
      onBlur={() => {
        editingRef.current = false;
        setBuffer(displayed);
      }}
      onChange={(e) => {
        setBuffer(e.target.value);
        onChange(e.target.value);
      }}
      style={pickerStyle}
    />
  );
}

function parseLocalDateTime(value: string): number | null {
  if (!value) return null;
  // Accepts "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss".
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function toLocalInputValue(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

function formatUtcLabel(d: Date): string {
  return (
    `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ` +
    `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} UTC`
  );
}

const rootStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 16,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 14px",
  background: "rgba(8, 10, 22, 0.78)",
  border: "1px solid rgba(120, 150, 220, 0.25)",
  borderRadius: 999,
  color: "#e5ecff",
  fontSize: 13,
  backdropFilter: "blur(8px)",
  zIndex: 10,
  maxWidth: "96vw",
  flexWrap: "wrap",
  justifyContent: "center",
};

const playButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  border: "1px solid rgba(158, 192, 255, 0.5)",
  background: "transparent",
  color: "#9ec0ff",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const speedGroupStyle: React.CSSProperties = {
  display: "inline-flex",
  gap: 4,
  padding: 2,
  border: "1px solid rgba(120, 150, 220, 0.3)",
  borderRadius: 999,
};

const speedButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "#98a6c9",
  border: "none",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontFamily: "inherit",
  cursor: "pointer",
};

const speedButtonSelectedStyle: React.CSSProperties = {
  background: "rgba(58, 111, 255, 0.25)",
  color: "#cfe0ff",
};

const pickerStyle: React.CSSProperties = {
  background: "#05060d",
  border: "1px solid rgba(120, 150, 220, 0.4)",
  borderRadius: 6,
  color: "#e5ecff",
  padding: "5px 8px",
  fontSize: 12,
  fontFamily: "inherit",
  colorScheme: "dark",
};

const nowButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "#9ec0ff",
  border: "1px solid rgba(158, 192, 255, 0.5)",
  borderRadius: 999,
  padding: "4px 12px",
  fontSize: 12,
  fontFamily: "inherit",
  cursor: "pointer",
};

const readoutStyle: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  color: "#98a6c9",
  fontSize: 12,
  minWidth: 180,
  textAlign: "right",
};
