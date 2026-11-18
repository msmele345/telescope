import { describe, expect, it } from "vitest";
import { parseMarkdown } from "@/lib/tours/markdown";

describe("parseMarkdown", () => {
  it("returns plain text as one paragraph", () => {
    expect(parseMarkdown("Look up.")).toEqual([[{ type: "text", text: "Look up." }]]);
  });

  it("splits paragraphs on blank lines and joins soft line breaks", () => {
    expect(parseMarkdown("One\nline.\n\nTwo.")).toEqual([
      [{ type: "text", text: "One line." }],
      [{ type: "text", text: "Two." }],
    ]);
  });

  it("reads **bold** and *italic* / _italic_", () => {
    expect(parseMarkdown("The **Belt** is *bright* and _close_.")).toEqual([
      [
        { type: "text", text: "The " },
        { type: "strong", children: [{ type: "text", text: "Belt" }] },
        { type: "text", text: " is " },
        { type: "em", children: [{ type: "text", text: "bright" }] },
        { type: "text", text: " and " },
        { type: "em", children: [{ type: "text", text: "close" }] },
        { type: "text", text: "." },
      ],
    ]);
  });

  it("nests emphasis inside a link", () => {
    expect(parseMarkdown("[the **Hunter**](/constellations/orion)")).toEqual([
      [
        {
          type: "link",
          href: "/constellations/orion",
          children: [
            { type: "text", text: "the " },
            { type: "strong", children: [{ type: "text", text: "Hunter" }] },
          ],
        },
      ],
    ]);
  });

  it("keeps only site-relative and https links, leaving others as their text", () => {
    expect(parseMarkdown("[x](javascript:alert(1))")).toEqual([
      [{ type: "text", text: "x" }],
    ]);
    expect(parseMarkdown("[x](https://example.com)")[0][0]).toMatchObject({
      type: "link",
      href: "https://example.com",
    });
  });

  it("leaves an unclosed marker as literal text", () => {
    expect(parseMarkdown("2 * 3 = 6")).toEqual([[{ type: "text", text: "2 * 3 = 6" }]]);
    expect(parseMarkdown("a **b")).toEqual([[{ type: "text", text: "a **b" }]]);
  });
});
