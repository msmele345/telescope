import type { ReactNode } from "react";
import type { Star } from "@/lib/star-catalog/types";
import { formatDecShort, formatRAShort } from "@/lib/constellation/coords";
import type { ConstellationMembers } from "@/lib/constellation/server";

export interface ConstellationContentProps {
  name: string;
  /** Pre-resolved authored lesson (e.g. an MDX component element), or null. */
  lesson: ReactNode | null;
  /** Catalog summary used by the coming-soon path. Pass null when unused. */
  members: ConstellationMembers | null;
}

/**
 * Renders either the authored lesson or a "coming soon" stub with sky
 * position + brightest stars. Pure: all data is passed in as props so the
 * component is straightforward to test in isolation.
 */
export default function ConstellationContent({
  name,
  lesson,
  members,
}: ConstellationContentProps) {
  if (lesson) {
    return <article style={lessonStyle}>{lesson}</article>;
  }

  if (!members) {
    return <ComingSoon name={name} />;
  }

  return <ComingSoon name={name} members={members} />;
}

function ComingSoon({
  name,
  members,
}: {
  name: string;
  members?: ConstellationMembers;
}) {
  const hasMembers =
    members && members.count > 0 && members.meanRA !== null && members.meanDec !== null;

  return (
    <>
      <section style={comingSoonStyle}>
        <p style={comingSoonHeading}>
          A full mythology and lesson for <strong>{name}</strong> are{" "}
          <em>coming soon.</em>
        </p>
        <p style={hintStyle}>
          In the meantime, here&apos;s what we know about it. Use the sky map to
          find {name} and look up at the real thing.
        </p>
      </section>

      {hasMembers && (
        <section style={stubSectionStyle} aria-label="Sky position">
          <h2 style={stubHeadingStyle}>Sky position</h2>
          <dl style={dlStyle}>
            <DefRow label="Right ascension">
              {formatRAShort(members!.meanRA!)}
            </DefRow>
            <DefRow label="Declination">
              {formatDecShort(members!.meanDec!)}
            </DefRow>
            <DefRow label="Catalog stars">{members!.count}</DefRow>
          </dl>
        </section>
      )}

      {members && members.brightest.length > 0 && (
        <section style={stubSectionStyle} aria-label="Brightest stars">
          <h2 style={stubHeadingStyle}>Brightest stars</h2>
          <ul style={starListStyle}>
            {members.brightest.map((s) => (
              <li key={s.id} style={starItemStyle}>
                <span style={starNameStyle}>{starDisplayName(s)}</span>
                <span style={starMetaStyle}>
                  mag {s.mag.toFixed(2)}
                  {typeof s.distLy === "number"
                    ? ` · ${s.distLy.toFixed(0)} ly`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function starDisplayName(s: Star): string {
  if (s.name) return s.name;
  if (s.bayer) return `${s.bayer} ${s.constellation ?? ""}`.trim();
  return `HR ${s.id}`;
}

function DefRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={defRowStyle}>
      <dt style={defTermStyle}>{label}</dt>
      <dd style={defValueStyle}>{children}</dd>
    </div>
  );
}

const lessonStyle: React.CSSProperties = {
  fontSize: 16,
  color: "#dde4f8",
};

const comingSoonStyle: React.CSSProperties = {
  background: "rgba(120, 150, 220, 0.08)",
  border: "1px solid rgba(120, 150, 220, 0.2)",
  borderRadius: 12,
  padding: "20px 22px",
  marginBottom: 24,
};

const comingSoonHeading: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
};

const hintStyle: React.CSSProperties = {
  marginTop: 12,
  marginBottom: 0,
  color: "#98a6c9",
  fontSize: 14,
};

const stubSectionStyle: React.CSSProperties = {
  marginTop: 32,
};

const stubHeadingStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 14,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#9ec0ff",
};

const dlStyle: React.CSSProperties = {
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const defRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "1px solid rgba(120, 150, 220, 0.12)",
  paddingBottom: 6,
};

const defTermStyle: React.CSSProperties = {
  margin: 0,
  color: "#98a6c9",
  fontSize: 14,
};

const defValueStyle: React.CSSProperties = {
  margin: 0,
  fontVariantNumeric: "tabular-nums",
  fontSize: 14,
};

const starListStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const starItemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "1px solid rgba(120, 150, 220, 0.12)",
  paddingBottom: 6,
  fontSize: 14,
};

const starNameStyle: React.CSSProperties = {
  color: "#e5ecff",
};

const starMetaStyle: React.CSSProperties = {
  color: "#98a6c9",
  fontVariantNumeric: "tabular-nums",
};
