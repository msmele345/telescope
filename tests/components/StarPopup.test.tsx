import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Stub server actions so jsdom doesn't evaluate next-auth at import time.
vi.mock("@/app/actions/user-data", () => ({
  getFavoriteState: vi.fn(async () => ({ status: "unauth" })),
  toggleFavorite: vi.fn(async () => ({ status: "unauth" })),
  toggleViewed: vi.fn(),
  toggleRead: vi.fn(),
}));

import StarPopup from "@/components/StarPopup";
import type { Star } from "@/lib/star-catalog";

// next/link is fine in jsdom; it just renders an anchor tag.

const BETELGEUSE: Star = {
  id: 2061,
  ra: 1.5497, // ~5h 55m (Orion)
  dec: 0.1294, // ~+7° 24'
  mag: 0.5,
  name: "Betelgeuse",
  bayer: "α",
  constellation: "Ori",
  colorK: 3500,
};

const UNNAMED_STAR: Star = {
  id: 9999,
  ra: 0,
  dec: 0,
  mag: 5.42,
};

describe("<StarPopup />", () => {
  it("renders nothing when star is null", () => {
    const { container } = render(<StarPopup star={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("displays the star's name, magnitude, and constellation", () => {
    render(<StarPopup star={BETELGEUSE} onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: /Betelgeuse/i })).toBeInTheDocument();
    expect(screen.getByText("0.50")).toBeInTheDocument();
    expect(screen.getByText("Orion")).toBeInTheDocument();
  });

  it("formats Bayer designation with the constellation genitive", () => {
    render(<StarPopup star={BETELGEUSE} onClose={() => {}} />);
    expect(screen.getByText(/α\s+Orionis/)).toBeInTheDocument();
  });

  it("links to the constellation page", () => {
    render(<StarPopup star={BETELGEUSE} onClose={() => {}} />);
    const link = screen.getByRole("link", { name: /read about orion/i });
    expect(link).toHaveAttribute("href", "/constellations/orion");
  });

  it("falls back to HR id and hides the Distance row when distance is absent", () => {
    render(<StarPopup star={UNNAMED_STAR} onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: /HR 9999/i })).toBeInTheDocument();
    expect(screen.queryByText(/Distance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unknown/i)).not.toBeInTheDocument();
  });

  it("renders the Distance row when the catalog provides distLy", () => {
    const withDistance: Star = { ...BETELGEUSE, distLy: 642 };
    render(<StarPopup star={withDistance} onClose={() => {}} />);
    expect(screen.getByText(/Distance/i)).toBeInTheDocument();
    expect(screen.getByText("642 ly")).toBeInTheDocument();
  });

  it("dismisses on Escape key", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<StarPopup star={BETELGEUSE} onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses when clicking outside the card", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <div>
        <button data-testid="outside">outside</button>
        <StarPopup star={BETELGEUSE} onClose={onClose} />
      </div>
    );
    await user.click(screen.getByTestId("outside"));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not dismiss when clicking inside the card", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<StarPopup star={BETELGEUSE} onClose={onClose} />);
    await user.click(screen.getByRole("heading", { name: /Betelgeuse/i }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("the close button calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<StarPopup star={BETELGEUSE} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
