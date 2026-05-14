import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const getFavoriteState = vi.fn();
const toggleFavorite = vi.fn();

vi.mock("@/app/actions/user-data", () => ({
  getFavoriteState: (...args: unknown[]) => getFavoriteState(...args),
  toggleFavorite: (...args: unknown[]) => toggleFavorite(...args),
  toggleViewed: vi.fn(),
  toggleRead: vi.fn(),
}));

import FavoriteButton from "@/components/user/FavoriteButton";

describe("<FavoriteButton />", () => {
  beforeEach(() => {
    getFavoriteState.mockReset();
    toggleFavorite.mockReset();
  });

  it("renders sign-in link when initialState is unauth", () => {
    render(
      <FavoriteButton
        type="star"
        targetId="2061"
        initialState="unauth"
        signInHint="to favorite this star"
      />
    );
    const link = screen.getByRole("link", { name: /sign in to favorite this star/i });
    expect(link).toHaveAttribute("href", "/login");
    // Server-action lookup must NOT fire for unauthenticated users.
    expect(getFavoriteState).not.toHaveBeenCalled();
  });

  it("fetches state on mount when initialState is omitted", async () => {
    getFavoriteState.mockResolvedValue({ status: "not" });
    render(<FavoriteButton type="star" targetId="2061" />);
    expect(await screen.findByRole("button", { name: /favorite/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(getFavoriteState).toHaveBeenCalledWith("star", "2061");
  });

  it("renders sign-in link when server says unauth", async () => {
    getFavoriteState.mockResolvedValue({ status: "unauth" });
    render(<FavoriteButton type="star" targetId="2061" signInHint="to favorite this star" />);
    expect(
      await screen.findByRole("link", { name: /sign in to favorite this star/i })
    ).toBeInTheDocument();
  });

  it("toggles to favorited after a successful add", async () => {
    const user = userEvent.setup();
    toggleFavorite.mockResolvedValue({ status: "added" });
    render(<FavoriteButton type="star" targetId="2061" initialState="not" />);

    const btn = screen.getByRole("button", { name: /favorite/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");

    await user.click(btn);

    expect(toggleFavorite).toHaveBeenCalledWith("star", "2061");
    expect(
      await screen.findByRole("button", { name: /favorited/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("flips to sign-in if server unexpectedly returns unauth", async () => {
    const user = userEvent.setup();
    toggleFavorite.mockResolvedValue({ status: "unauth" });
    render(<FavoriteButton type="constellation" targetId="orion" initialState="not" />);

    await user.click(screen.getByRole("button", { name: /favorite/i }));

    expect(
      await screen.findByRole("link", { name: /sign in/i })
    ).toBeInTheDocument();
  });
});
