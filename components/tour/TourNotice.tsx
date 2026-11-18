"use client";

export interface TourNoticeProps {
  message: string;
  onDismiss: () => void;
}

/** A dismissible note, e.g. that a tour can't be seen from here. */
export default function TourNotice({ message, onDismiss }: TourNoticeProps) {
  return (
    <div role="status" style={noticeStyle}>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" style={dismissStyle}>
        ×
      </button>
    </div>
  );
}

const noticeStyle: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: 84,
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "center",
  gap: 12,
  maxWidth: "calc(100vw - 32px)",
  padding: "8px 10px 8px 14px",
  background: "rgba(8, 10, 22, 0.86)",
  border: "1px solid rgba(255, 210, 120, 0.4)",
  borderRadius: 8,
  color: "#ffe2a8",
  fontSize: 13,
  backdropFilter: "blur(8px)",
  zIndex: 11,
  boxSizing: "border-box",
};

const dismissStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "inherit",
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  padding: "0 4px",
};
