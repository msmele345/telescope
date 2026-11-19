import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AppearsIn from "@/components/tour/AppearsIn";
import type { Tour } from "@/lib/tours";

function tour(slug: string, title: string): Tour {
  return {
    slug,
    title,
    summary: "",
    window: { from: { month: 1, day: 1 }, to: { month: 12, day: 31 } },
    stops: [],
  };
}

describe("AppearsIn", () => {
  it("links each tour to its /?tour= deep link", () => {
    render(
      <AppearsIn
        tours={[tour("winter-hexagon", "Winter Hexagon"), tour("around-orion", "Around Orion")]}
      />
    );
    expect(screen.getByText(/Appears in:/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Winter Hexagon →" })).toHaveAttribute(
      "href",
      "/?tour=winter-hexagon"
    );
    expect(screen.getByRole("link", { name: "Around Orion →" })).toHaveAttribute(
      "href",
      "/?tour=around-orion"
    );
  });

  it("renders nothing when the constellation is on no tour", () => {
    const { container } = render(<AppearsIn tours={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
