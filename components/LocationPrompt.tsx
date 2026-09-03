"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  normalizeZip,
  zipToLatLng,
  type ZipLocation,
} from "@/lib/zip-geocoder";
import type { SavedObserver } from "@/lib/observer";

export interface LocationPromptProps {
  /** Current observer (if any) — controls banner label between "Set" vs "Change". */
  observer?: SavedObserver | null;
  /** Called when a zipcode resolves successfully. */
  onResolve: (observer: SavedObserver) => void;
  /** Override the resolver (for tests). Default calls the bundled zipcode DB. */
  resolveZip?: (zip: string) => Promise<ZipLocation | null>;
}

type Status =
  | { kind: "idle" }
  | { kind: "resolving" }
  | { kind: "error"; message: string };

function locationToObserver(loc: ZipLocation): SavedObserver {
  return {
    lat: loc.lat,
    lng: loc.lng,
    zip: loc.zip,
    city: loc.city,
    state: loc.state,
    label:
      loc.city && loc.state
        ? `${loc.city}, ${loc.state} ${loc.zip}`
        : loc.zip,
  };
}

export default function LocationPrompt({
  observer,
  onResolve,
  resolveZip = zipToLatLng,
}: LocationPromptProps) {
  const [open, setOpen] = useState(false);
  const [zip, setZip] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!normalizeZip(zip)) {
        setStatus({
          kind: "error",
          message: "Enter a 5-digit US zipcode.",
        });
        return;
      }
      setStatus({ kind: "resolving" });
      try {
        const loc = await resolveZip(zip);
        if (!loc) {
          setStatus({
            kind: "error",
            message: "We don't have that zipcode on file. Double-check?",
          });
          return;
        }
        onResolve(locationToObserver(loc));
        setStatus({ kind: "idle" });
        setZip("");
        setOpen(false);
      } catch (err) {
        setStatus({
          kind: "error",
          message: "Something went wrong loading the zipcode database.",
        });
      }
    },
    [zip, resolveZip, onResolve]
  );

  return (
    <>
      <div style={bannerStyle} role="status">
        <span style={bannerLabelStyle}>
          {observer?.label ? (
            <>
              Showing the sky from <strong>{observer.label}</strong>
            </>
          ) : (
            <>Showing a default US view — set your location for your real sky.</>
          )}
        </span>
        <button
          type="button"
          style={bannerButtonStyle}
          onClick={() => setOpen(true)}
        >
          {observer ? "Change location" : "Set your location"}
        </button>
      </div>

      {open && (
        <div
          style={modalBackdropStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-prompt-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form style={modalStyle} onSubmit={handleSubmit}>
            <h2 id="location-prompt-title" style={{ margin: 0, fontSize: 18 }}>
              Enter your US zipcode
            </h2>
            <p style={modalHintStyle}>
              We use your zipcode to render the sky as it appears from your
              latitude and longitude.
            </p>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={10}
              placeholder="e.g. 55401"
              value={zip}
              onChange={(e) => {
                setZip(e.target.value);
                if (status.kind === "error") setStatus({ kind: "idle" });
              }}
              style={inputStyle}
              aria-label="US zipcode"
              aria-invalid={status.kind === "error"}
            />
            {status.kind === "error" && (
              <div role="alert" style={errorStyle}>
                {status.message}
              </div>
            )}
            <div style={actionsStyle}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status.kind === "resolving"}
                style={primaryButtonStyle}
              >
                {status.kind === "resolving" ? "Locating…" : "Set location"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

const bannerStyle: React.CSSProperties = {
  position: "fixed",
  top: 16,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "10px 16px",
  background: "rgba(8, 10, 22, 0.78)",
  border: "1px solid rgba(120, 150, 220, 0.25)",
  borderRadius: 999,
  color: "#e5ecff",
  fontSize: 13,
  backdropFilter: "blur(8px)",
  zIndex: 10,
  maxWidth: "92vw",
};

const bannerLabelStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const bannerButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "#9ec0ff",
  border: "1px solid rgba(158, 192, 255, 0.5)",
  borderRadius: 999,
  padding: "4px 12px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 20,
};

const modalStyle: React.CSSProperties = {
  background: "#0c1022",
  border: "1px solid rgba(120, 150, 220, 0.3)",
  borderRadius: 12,
  padding: 24,
  width: "min(420px, 92vw)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  color: "#e5ecff",
};

const modalHintStyle: React.CSSProperties = {
  margin: 0,
  color: "#98a6c9",
  fontSize: 13,
  lineHeight: 1.45,
};

const inputStyle: React.CSSProperties = {
  background: "#05060d",
  border: "1px solid rgba(120, 150, 220, 0.4)",
  borderRadius: 6,
  color: "#fff",
  padding: "10px 12px",
  fontSize: 16,
  fontFamily: "inherit",
};

const errorStyle: React.CSSProperties = {
  color: "#ff9ea8",
  fontSize: 13,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 4,
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#3a6fff",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  cursor: "pointer",
  fontWeight: 500,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "#e5ecff",
  border: "1px solid rgba(120, 150, 220, 0.35)",
  borderRadius: 6,
  padding: "8px 16px",
  cursor: "pointer",
};
