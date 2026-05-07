import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ToggleButton from "@/components/user/ToggleButton";

describe("<ToggleButton />", () => {
  it("renders sign-in link when unauthenticated", () => {
    render(
      <ToggleButton
        action={vi.fn()}
        initialPressed={false}
        isAuthenticated={false}
        inactiveLabel="Mark as viewed"
        activeLabel="Viewed"
        signInHint="to mark constellations as viewed"
      />
    );
    expect(
      screen.getByRole("link", { name: /sign in to mark constellations as viewed/i })
    ).toHaveAttribute("href", "/login");
  });

  it("invokes the action and flips to active on success", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ status: "added" });

    render(
      <ToggleButton
        action={action}
        initialPressed={false}
        isAuthenticated={true}
        inactiveLabel="Mark as viewed"
        activeLabel="✓ Viewed"
        signInHint="…"
      />
    );

    const btn = screen.getByRole("button", { name: /mark as viewed/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");

    await user.click(btn);

    expect(action).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("button", { name: /viewed/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("flips back to inactive on remove", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ status: "removed" });

    render(
      <ToggleButton
        action={action}
        initialPressed={true}
        isAuthenticated={true}
        inactiveLabel="Mark lesson as read"
        activeLabel="✓ Read"
        signInHint="…"
      />
    );

    await user.click(screen.getByRole("button", { name: /read/i }));

    expect(
      await screen.findByRole("button", { name: /mark lesson as read/i })
    ).toHaveAttribute("aria-pressed", "false");
  });
});
