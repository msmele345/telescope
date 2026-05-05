import type { MDXComponents } from "mdx/types";
import type { CSSProperties, ReactNode } from "react";

const h2Style: CSSProperties = {
  margin: "32px 0 12px",
  fontSize: 22,
  fontWeight: 600,
  color: "#e5ecff",
  letterSpacing: "-0.005em",
};

const h3Style: CSSProperties = {
  margin: "24px 0 8px",
  fontSize: 17,
  fontWeight: 600,
  color: "#e5ecff",
};

const pStyle: CSSProperties = {
  margin: "0 0 16px",
  color: "#dde4f8",
  fontSize: 16,
  lineHeight: 1.7,
};

const ulStyle: CSSProperties = {
  margin: "0 0 16px",
  paddingLeft: 22,
  color: "#dde4f8",
  fontSize: 16,
  lineHeight: 1.7,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const liStyle: CSSProperties = {
  paddingLeft: 4,
};

const strongStyle: CSSProperties = {
  color: "#fff",
  fontWeight: 600,
};

const emStyle: CSSProperties = {
  color: "#cbd5f5",
  fontStyle: "italic",
};

const linkStyle: CSSProperties = {
  color: "#9ec0ff",
  textDecoration: "underline",
  textUnderlineOffset: 2,
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: ({ children }: { children?: ReactNode }) => (
      <h2 style={h2Style}>{children}</h2>
    ),
    h3: ({ children }: { children?: ReactNode }) => (
      <h3 style={h3Style}>{children}</h3>
    ),
    p: ({ children }: { children?: ReactNode }) => (
      <p style={pStyle}>{children}</p>
    ),
    ul: ({ children }: { children?: ReactNode }) => (
      <ul style={ulStyle}>{children}</ul>
    ),
    li: ({ children }: { children?: ReactNode }) => (
      <li style={liStyle}>{children}</li>
    ),
    strong: ({ children }: { children?: ReactNode }) => (
      <strong style={strongStyle}>{children}</strong>
    ),
    em: ({ children }: { children?: ReactNode }) => (
      <em style={emStyle}>{children}</em>
    ),
    a: ({ children, href }: { children?: ReactNode; href?: string }) => (
      <a href={href} style={linkStyle}>
        {children}
      </a>
    ),
    ...components,
  };
}
