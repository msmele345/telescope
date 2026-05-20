"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  loadCatalog,
  searchStars,
  type Star,
} from "@/lib/star-catalog";
import {
  getConstellationByAbbr,
  searchConstellations,
  type ConstellationMeta,
} from "@/lib/constellation";

export interface SkyDirectoryProps {
  /** Open the same star popup the canvas opens on click. */
  onSelectStar: (star: Star) => void;
}

const MAX_RESULTS = 12;

/**
 * Accessibility path: a DOM-based, keyboard-navigable, screen-reader-friendly
 * search over every catalog star and all 88 constellations. It is the
 * non-canvas way to reach the exact same detail flows — selecting a star
 * opens the shared StarPopup; selecting a constellation links to its page.
 *
 * Reachable from anywhere on the map via Tab (the toggle is in normal tab
 * order) or the "/" shortcut. Esc closes and returns focus to the toggle.
 */
export default function SkyDirectory({ onSelectStar }: SkyDirectoryProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Star[] | null>(null);

  const toggleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelId = useId();
  const statusId = useId();

  // Lazy-load the catalog the first time the panel opens — same source the
  // canvas uses, so results and click targets stay in sync.
  useEffect(() => {
    if (!open || catalog) return;
    let cancelled = false;
    loadCatalog().then(
      (loaded) => {
        if (!cancelled) setCatalog(loaded);
      },
      () => {
        /* directory is best-effort; canvas remains usable */
      }
    );
    return () => {
      cancelled = true;
    };
  }, [open, catalog]);

  // Global "/" shortcut opens the directory (ignored while typing elsewhere).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Move focus into the search field when the panel opens; when it closes
  // after having been open, return focus to the toggle (the toggle button
  // only exists in the DOM while closed, so this must run post-render).
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      toggleRef.current?.focus();
      wasOpenRef.current = false;
    }
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const stars = useMemo(
    () => (catalog ? searchStars(catalog, query, { limit: MAX_RESULTS }) : []),
    [catalog, query]
  );
  const constellations = useMemo(
    () => searchConstellations(query, MAX_RESULTS),
    [query]
  );
  const hasQuery = query.trim().length > 0;
  const total = stars.length + constellations.length;

  const handleStar = useCallback(
    (star: Star) => {
      onSelectStar(star);
      setOpen(false);
    },
    [onSelectStar]
  );

  // Roving focus: ↓/↑ moves between results, Esc closes.
  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("[data-result]") ?? []
    );
    if (items.length === 0) return;
    e.preventDefault();
    const active = document.activeElement as HTMLElement | null;
    const idx = items.indexOf(active as HTMLElement);
    const nextIdx =
      e.key === "ArrowDown"
        ? idx < 0
          ? 0
          : Math.min(idx + 1, items.length - 1)
        : idx <= 0
          ? 0
          : idx - 1;
    items[nextIdx]?.focus();
  };

  if (!open) {
    return (
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-keyshortcuts="/"
        style={toggleStyle}
        className="sky-directory-toggle"
      >
        <span aria-hidden="true">⌕</span> Search the sky
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Search stars and constellations"
      aria-describedby={statusId}
      id={panelId}
      style={panelStyle}
      onKeyDown={onPanelKeyDown}
      className="sky-directory-panel"
    >
      <div style={panelHeaderStyle}>
        <label htmlFor={`${panelId}-input`} style={panelTitleStyle}>
          Search the sky
        </label>
        <button
          type="button"
          onClick={close}
          aria-label="Close search"
          style={closeStyle}
        >
          ×
        </button>
      </div>

      <input
        ref={inputRef}
        id={`${panelId}-input`}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. Betelgeuse, Orion, HR 2061"
        autoComplete="off"
        spellCheck={false}
        aria-controls={`${panelId}-results`}
        style={inputStyle}
      />

      <p id={statusId} role="status" aria-live="polite" style={statusStyle}>
        {!catalog
          ? "Loading catalog…"
          : !hasQuery
            ? "Type to search stars and constellations."
            : total === 0
              ? `No matches for “${query.trim()}”.`
              : `${stars.length} star${stars.length === 1 ? "" : "s"}, ` +
                `${constellations.length} constellation${
                  constellations.length === 1 ? "" : "s"
                }.`}
      </p>

      <ul
        ref={listRef}
        id={`${panelId}-results`}
        style={resultsStyle}
        aria-label="Search results"
      >
        {constellations.map((c) => (
          <li key={`c-${c.abbr}`}>
            <Link
              href={`/constellations/${c.slug}`}
              data-result
              style={resultStyle}
              onClick={() => setOpen(false)}
            >
              <span style={kindStyle}>Constellation</span>
              <span style={resultNameStyle}>{c.name}</span>
              <span style={resultMetaStyle}>{c.genitive}</span>
            </Link>
          </li>
        ))}
        {stars.map((s) => (
          <li key={`s-${s.id}`}>
            <button
              type="button"
              data-result
              onClick={() => handleStar(s)}
              style={{ ...resultStyle, ...resultButtonReset }}
            >
              <span style={kindStyle}>Star</span>
              <span style={resultNameStyle}>{starLabel(s)}</span>
              <span style={resultMetaStyle}>
                mag {s.mag.toFixed(2)}
                {constellationName(s) ? ` · ${constellationName(s)}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function starLabel(s: Star): string {
  return s.name ?? (s.bayer ? `${s.bayer} ${s.constellation ?? ""}`.trim() : `HR ${s.id}`);
}

function constellationName(s: Star): string | null {
  const c: ConstellationMeta | null = getConstellationByAbbr(s.constellation);
  return c?.name ?? s.constellation ?? null;
}

const toggleStyle: React.CSSProperties = {
  position: "fixed",
  top: 64,
  left: 20,
  zIndex: 40,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
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
  top: 64,
  left: 20,
  zIndex: 45,
  width: "min(360px, calc(100vw - 40px))",
  maxHeight: "min(70vh, 560px)",
  display: "flex",
  flexDirection: "column",
  background: "rgba(8, 10, 22, 0.94)",
  border: "1px solid rgba(120, 150, 220, 0.32)",
  borderRadius: 12,
  padding: 14,
  color: "#e5ecff",
  backdropFilter: "blur(12px)",
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
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
  fontSize: 16,
  lineHeight: "1",
  cursor: "pointer",
  fontFamily: "inherit",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "rgba(0, 0, 0, 0.4)",
  border: "1px solid rgba(120, 150, 220, 0.35)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 14,
  fontFamily: "inherit",
};

const statusStyle: React.CSSProperties = {
  margin: "10px 2px 6px",
  fontSize: 12,
  color: "#7e8aac",
};

const resultsStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  overflowY: "auto",
};

const resultStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  columnGap: 10,
  rowGap: 2,
  width: "100%",
  textAlign: "left",
  padding: "8px 10px",
  borderRadius: 8,
  color: "#e5ecff",
  textDecoration: "none",
};

const resultButtonReset: React.CSSProperties = {
  background: "transparent",
  border: "none",
  font: "inherit",
  cursor: "pointer",
};

const kindStyle: React.CSSProperties = {
  gridRow: "1 / 3",
  alignSelf: "center",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#7e8aac",
  border: "1px solid rgba(120, 150, 220, 0.3)",
  borderRadius: 5,
  padding: "2px 6px",
};

const resultNameStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
};

const resultMetaStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#8b97ba",
};
