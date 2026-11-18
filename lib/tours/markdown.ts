/**
 * The small slice of markdown a stop's `body` uses: paragraphs, **bold**,
 * *italic* (or _italic_) and [links](/path). Parsed to plain nodes so the
 * panel renders them as React elements, with no HTML string anywhere.
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "link"; href: string; children: Inline[] };

/** One array of inline nodes per paragraph. */
export function parseMarkdown(source: string): Inline[][] {
  return source
    .split(/\n\s*\n/)
    .map((para) => para.replace(/\s*\n\s*/g, " ").trim())
    .filter((para) => para.length > 0)
    .map(parseInline);
}

/** Site-relative paths and https URLs only. */
function isSafeHref(href: string): boolean {
  return (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("https://");
}

function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pushText = (value: string) => {
    if (!value) return;
    const last = out[out.length - 1];
    if (last?.type === "text") last.text += value;
    else out.push({ type: "text", text: value });
  };

  let i = 0;
  while (i < text.length) {
    const match = matchAt(text, i);
    if (match) {
      for (const node of match.nodes) {
        if (node.type === "text") pushText(node.text);
        else out.push(node);
      }
      i = match.end;
    } else {
      pushText(text[i]);
      i++;
    }
  }
  return out;
}

interface Match {
  nodes: Inline[];
  end: number;
}

function matchAt(text: string, i: number): Match | null {
  if (text.startsWith("**", i)) {
    const close = findCloser(text, "**", i + 2);
    if (close !== -1) {
      return {
        nodes: [{ type: "strong", children: parseInline(text.slice(i + 2, close)) }],
        end: close + 2,
      };
    }
    return null;
  }
  const ch = text[i];
  if (ch === "*" || ch === "_") {
    const close = findCloser(text, ch, i + 1);
    if (close !== -1) {
      return {
        nodes: [{ type: "em", children: parseInline(text.slice(i + 1, close)) }],
        end: close + 1,
      };
    }
    return null;
  }
  if (ch === "[") return matchLink(text, i);
  return null;
}

/**
 * The index of the marker closing an emphasis that opens just before
 * `from`, or -1. An opener must be followed, and a closer preceded, by a
 * non-space, so "2 * 3" stays literal.
 */
function findCloser(text: string, marker: string, from: number): number {
  if (from >= text.length || /\s/.test(text[from])) return -1;
  let at = text.indexOf(marker, from + 1);
  while (at !== -1) {
    // A single "*" must not be half of a "**".
    const doubled = marker === "*" && (text[at + 1] === "*" || text[at - 1] === "*");
    if (!/\s/.test(text[at - 1]) && !doubled) return at;
    at = text.indexOf(marker, at + 1);
  }
  return -1;
}

function matchLink(text: string, i: number): Match | null {
  const labelEnd = text.indexOf("](", i + 1);
  if (labelEnd === -1) return null;
  // The href may itself hold parentheses; find the one that balances.
  let depth = 1;
  let j = labelEnd + 2;
  for (; j < text.length && depth > 0; j++) {
    if (text[j] === "(") depth++;
    else if (text[j] === ")") depth--;
  }
  if (depth !== 0) return null;
  const href = text.slice(labelEnd + 2, j - 1).trim();
  const children = parseInline(text.slice(i + 1, labelEnd));
  // An unsafe link keeps its text and loses its target.
  if (!isSafeHref(href)) return { nodes: children, end: j };
  return { nodes: [{ type: "link", href, children }], end: j };
}
