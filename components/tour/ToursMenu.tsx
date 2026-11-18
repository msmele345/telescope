"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ObserverLocation } from "@/lib/observer";
import {
  TOURS,
  findTourTime,
  nextTourLabel,
  sortByTourTime,
  type Tour,
  type TourListEntry,
} from "@/lib/tours";
import { loadTourCatalogs } from "@/lib/tours/load-catalogs";

export interface ToursMenuProps {
  /** The observer to find tour times for, read each time the list opens. */
  getObserver: () => ObserverLocation;
  /** Real now, which tour times are searched from. */
  getNow: () => Date;
  /** Defaults to every registered tour. */
  tours?: readonly Tour[];
}

type ListState =
  | { status: "loading" }
  | { status: "ready"; entries: TourListEntry[] }
  | { status: "error" };

/**
 * The map's way into tours: a button that opens a list of every tour, with
 * when it is next visible from the current observer, soonest first. Choosing
 * a tour follows its `/?tour=` link, which the tour player picks up. A tour
 * with no tour time is listed last and can't be started.
 *
 * Keyboard: the button is in normal tab order; ↓/↑ move between tours and
 * Esc closes, returning focus to the button.
 */
export default function ToursMenu({ getObserver, getNow, tours = TOURS }: ToursMenuProps) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const headingId = useId();

  // Tour times depend on the observer and the time, so work them out afresh
  // each time the list opens.
  const latest = useRef({ getObserver, getNow, tours });
  latest.current = { getObserver, getNow, tours };
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setList({ status: "loading" });
    loadTourCatalogs()
      .then((catalogs) => {
        if (cancelled) return;
        const { getObserver, getNow, tours } = latest.current;
        const observer = getObserver();
        const now = getNow();
        const entries = tours.map((tour) => ({
          tour,
          time: findTourTime(tour, observer, now, catalogs),
        }));
        setList({ status: "ready", entries: sortByTourTime(entries) });
      })
      .catch((err) => {
        console.error("Failed to load tours", err);
        if (!cancelled) setList({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Once the list is ready, focus the first tour that can be started.
  useEffect(() => {
    if (!open || list.status !== "ready") return;
    const first = panelRef.current?.querySelector<HTMLElement>("[data-tour-item]");
    first?.focus();
  }, [open, list.status]);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      // Don't let Esc also reach the tour player, which exits on it.
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>("[data-tour-item]") ?? []
    );
    if (items.length === 0) return;
    e.preventDefault();
    const idx = items.indexOf(document.activeElement as HTMLElement);
    const step = e.key === "ArrowDown" ? 1 : -1;
    const nextIdx = idx === -1 ? 0 : (idx + step + items.length) % items.length;
    items[nextIdx].focus();
  };

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
        style={toggleStyle}
      >
        Tours
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="region"
          aria-labelledby={headingId}
          onKeyDown={onPanelKeyDown}
          style={panelStyle}
        >
          <div style={panelHeaderStyle}>
            <span id={headingId} style={panelTitleStyle}>
              Guided tours
            </span>
            <button
              type="button"
              onClick={() => close(true)}
              aria-label="Close tours"
              style={closeStyle}
            >
              ×
            </button>
          </div>

          {list.status === "loading" && (
            <p role="status" style={statusStyle}>
              Finding when each tour is visible…
            </p>
          )}
          {list.status === "error" && (
            <p role="status" style={statusStyle}>
              Couldn&apos;t load tours. Try again in a moment.
            </p>
          )}
          {list.status === "ready" && (
            <ul aria-label="Tours" style={listStyle}>
              {list.entries.map((entry) => (
                <li key={entry.tour.slug}>
                  <TourItem entry={entry} onChoose={() => close(false)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function TourItem({ entry, onChoose }: { entry: TourListEntry; onChoose: () => void }) {
  const { tour, time } = entry;
  const stops = tour.stops.length;
  const body = (
    <>
      <h2 style={titleStyle}>{tour.title}</h2>
      <p style={summaryStyle}>{tour.summary}</p>
      <p style={metaStyle}>
        <span>
          {stops} stop{stops === 1 ? "" : "s"}
        </span>
        <span aria-hidden="true"> · </span>
        <span style={time?.tonight ? tonightStyle : undefined}>{nextTourLabel(time)}</span>
      </p>
    </>
  );

  if (!time) {
    return (
      <div aria-disabled="true" style={{ ...itemStyle, ...unavailableStyle }}>
        {body}
      </div>
    );
  }
  return (
    <Link href={`/?tour=${tour.slug}`} data-tour-item onClick={onChoose} style={itemStyle}>
      {body}
    </Link>
  );
}

const toggleStyle: React.CSSProperties = {
  position: "fixed",
  top: 108,
  left: 20,
  zIndex: 40,
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 14px",
  background: "rgba(8, 10, 22, 0.82)",
  color: "#cdd9ff",
  border: "1px solid rgba(120, 150, 220, 0.35)",
  borderRadius: 999,
  fontSize: 13,
  fontFamily: "inherit",
  cursor: "pointer",
  backdropFilter: "blur(8px)",
};

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 152,
  left: 20,
  zIndex: 42,
  width: "min(360px, calc(100vw - 40px))",
  maxHeight: "min(60vh, 520px)",
  display: "flex",
  flexDirection: "column",
  background: "rgba(8, 10, 22, 0.94)",
  border: "1px solid rgba(120, 150, 220, 0.32)",
  borderRadius: 12,
  padding: 14,
  color: "#e5ecff",
  backdropFilter: "blur(12px)",
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
  boxSizing: "border-box",
};

const panelHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#9aaad0",
};

const closeStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: "50%",
  background: "transparent",
  color: "#9ec0ff",
  border: "1px solid rgba(120, 150, 220, 0.35)",
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
};

const statusStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#9aaad0",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const itemStyle: React.CSSProperties = {
  display: "block",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(120, 150, 220, 0.18)",
  color: "inherit",
  textDecoration: "none",
};

const unavailableStyle: React.CSSProperties = {
  opacity: 0.55,
  cursor: "not-allowed",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 600,
};

const summaryStyle: React.CSSProperties = {
  margin: "4px 0 6px",
  fontSize: 13,
  lineHeight: 1.45,
  color: "#b8c4e4",
};

const metaStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "#9aaad0",
};

const tonightStyle: React.CSSProperties = {
  color: "#ffe2a8",
};
