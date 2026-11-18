import Link from "next/link";
import { Fragment } from "react";
import { parseMarkdown, type Inline } from "@/lib/tours/markdown";

/** A stop's body, as ordinary DOM text. */
export default function TourMarkdown({ source }: { source: string }) {
  return (
    <>
      {parseMarkdown(source).map((para, i) => (
        <p key={i} style={paragraphStyle}>
          <Inlines nodes={para} />
        </p>
      ))}
    </>
  );
}

function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((node, i) => (
        <Fragment key={i}>{renderInline(node)}</Fragment>
      ))}
    </>
  );
}

function renderInline(node: Inline): React.ReactNode {
  switch (node.type) {
    case "text":
      return node.text;
    case "strong":
      return (
        <strong>
          <Inlines nodes={node.children} />
        </strong>
      );
    case "em":
      return (
        <em>
          <Inlines nodes={node.children} />
        </em>
      );
    case "link":
      return (
        <Link href={node.href} style={linkStyle}>
          <Inlines nodes={node.children} />
        </Link>
      );
  }
}

const paragraphStyle: React.CSSProperties = { margin: "0 0 8px", lineHeight: 1.5 };
const linkStyle: React.CSSProperties = { color: "#9ec0ff" };
