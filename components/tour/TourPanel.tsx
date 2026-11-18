"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { getConstellationByAbbr } from "@/lib/constellation";
import type { Tour } from "@/lib/tours";
import TourMarkdown from "./TourMarkdown";
import type { LeaveChoice } from "./useTourPlayer";

export interface TourPanelProps {
  tour: Tour;
  /** Zero-based. */
  stop: number;
  /** Showing the Return / Stay choice. */
  leaving: boolean;
  /** The jump note when the tour time isn't tonight, else null. */
  jumpNote: string | null;
  /** "Return to now" or "Return to <time>". */
  returnText: string;
  /** A popup is open: Esc is its to close first. */
  popupOpen: boolean;
  onNext: () => void;
  onBack: () => void;
  onRequestLeave: () => void;
  onCancelLeave: () => void;
  onLeave: (choice: LeaveChoice) => void;
}

/**
 * The tour's commentary and controls. Plain DOM text, so the whole tour can
 * be followed with a keyboard or screen reader without the canvas.
 * ← / → move between stops, Esc asks to leave.
 */
export default function TourPanel({
  tour,
  stop,
  leaving,
  jumpNote,
  returnText,
  popupOpen,
  onNext,
  onBack,
  onRequestLeave,
  onCancelLeave,
  onLeave,
}: TourPanelProps) {
  const current = tour.stops[stop];
  const total = tour.stops.length;
  const isLast = stop === total - 1;
  const lesson =
    current.kind === "constellation" ? getConstellationByAbbr(current.id) : undefined;

  const keys = useRef({ leaving, popupOpen, onNext, onBack, onRequestLeave, onCancelLeave });
  keys.current = { leaving, popupOpen, onNext, onBack, onRequestLeave, onCancelLeave };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isTyping(e.target)) return;
      const k = keys.current;
      if (e.key === "Escape") {
        // An open popup closes on this Esc; the next one leaves the tour.
        if (k.popupOpen) return;
        if (k.leaving) k.onCancelLeave();
        else k.onRequestLeave();
      } else if (!k.leaving && e.key === "ArrowRight") {
        e.preventDefault();
        k.onNext();
      } else if (!k.leaving && e.key === "ArrowLeft") {
        e.preventDefault();
        k.onBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const returnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (leaving) returnRef.current?.focus();
  }, [leaving]);

  return (
    <section aria-label={`Tour: ${tour.title}`} style={panelStyle}>
      <div style={eyebrowStyle}>
        <span>{tour.title}</span>
        <span>
          Stop {stop + 1} of {total}
        </span>
      </div>
      {jumpNote && <p style={jumpStyle}>{jumpNote}</p>}

      {leaving ? (
        <div role="group" aria-label="Leave the tour">
          <p style={leavePromptStyle}>
            {isLast ? "That's the end of the tour." : "Leave the tour?"} Go back to the time you
            were viewing, or stay on this sky?
          </p>
          <div style={rowStyle}>
            <button
              ref={returnRef}
              type="button"
              onClick={() => onLeave("return")}
              style={primaryButtonStyle}
            >
              {returnText}
            </button>
            <button type="button" onClick={() => onLeave("stay")} style={buttonStyle}>
              Stay here
            </button>
          </div>
          <button type="button" onClick={onCancelLeave} style={textButtonStyle}>
            ← Back to the tour
          </button>
        </div>
      ) : (
        <>
          <div aria-live="polite">
            <h2 style={headingStyle}>{current.heading}</h2>
            <TourMarkdown source={current.body} />
            {lesson && (
              <Link href={`/constellations/${lesson.slug}`} style={lessonLinkStyle}>
                Read the full lesson →
              </Link>
            )}
          </div>
          <div style={{ ...rowStyle, marginTop: 12 }}>
            <button type="button" onClick={onBack} disabled={stop === 0} style={buttonStyle}>
              Back
            </button>
            <button type="button" onClick={onNext} style={primaryButtonStyle}>
              {isLast ? "Finish" : "Next"}
            </button>
            <button type="button" onClick={onRequestLeave} style={{ ...buttonStyle, marginLeft: "auto" }}>
              Exit
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

const panelStyle: React.CSSProperties = {
  position: "fixed",
  left: 16,
  bottom: 84,
  width: "min(360px, calc(100vw - 32px))",
  maxHeight: "min(52vh, 440px)",
  overflowY: "auto",
  padding: "14px 16px",
  background: "rgba(8, 10, 22, 0.86)",
  border: "1px solid rgba(120, 150, 220, 0.3)",
  borderRadius: 12,
  color: "#e5ecff",
  fontSize: 14,
  backdropFilter: "blur(8px)",
  zIndex: 11,
  boxSizing: "border-box",
};

const eyebrowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 12,
  color: "#98a6c9",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const jumpStyle: React.CSSProperties = {
  margin: "8px 0 0",
  padding: "6px 8px",
  fontSize: 12,
  lineHeight: 1.4,
  color: "#ffe2a8",
  background: "rgba(255, 210, 120, 0.1)",
  borderRadius: 6,
};

const headingStyle: React.CSSProperties = {
  margin: "10px 0 6px",
  fontSize: 18,
  fontWeight: 600,
};

const lessonLinkStyle: React.CSSProperties = {
  color: "#9ec0ff",
  fontSize: 13,
  textDecoration: "none",
};

const leavePromptStyle: React.CSSProperties = { margin: "12px 0", lineHeight: 1.5 };

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const buttonStyle: React.CSSProperties = {
  background: "transparent",
  color: "#cfe0ff",
  border: "1px solid rgba(158, 192, 255, 0.5)",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 13,
  fontFamily: "inherit",
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "rgba(58, 111, 255, 0.35)",
  color: "#fff",
};

const textButtonStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 0,
  background: "none",
  border: "none",
  color: "#98a6c9",
  fontSize: 12,
  fontFamily: "inherit",
  cursor: "pointer",
};
