import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";

// SiteHeader imports `signOut` from "@/auth", which would pull in pg + the
// adapter. Stub the module before importing the component under test.
vi.mock("@/auth", () => ({
  signOut: vi.fn(),
}));

import SiteHeader from "@/components/SiteHeader";

describe("<SiteHeader />", () => {
  it("shows a sign-in link when there is no session", () => {
    render(<SiteHeader session={null} />);
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login"
    );
    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
  });

  it("shows the user email and a sign-out button when authenticated", () => {
    const session: Session = {
      user: { id: "42", email: "ada@example.com", name: "Ada" },
      expires: "2099-01-01T00:00:00.000Z",
    };
    render(<SiteHeader session={session} />);
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign out/i })
    ).toBeInTheDocument();
  });

  it("falls back to name when the session has no email", () => {
    const session: Session = {
      user: { id: "42", name: "Ada" },
      expires: "2099-01-01T00:00:00.000Z",
    };
    render(<SiteHeader session={session} />);
    expect(screen.getByText("Ada")).toBeInTheDocument();
  });
});
