import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const usePathname = vi.fn<() => string | null>();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

import SignInLink from "@/components/SignInLink";

describe("<SignInLink />", () => {
  beforeEach(() => {
    usePathname.mockReset();
  });

  it("passes the page it was clicked from along to sign-in", () => {
    usePathname.mockReturnValue("/constellations/orion");
    render(<SignInLink>Sign in</SignInLink>);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Fconstellations%2Forion"
    );
  });

  it("prefers an explicit destination, e.g. a star popup that isn't in the URL", () => {
    usePathname.mockReturnValue("/");
    render(<SignInLink returnTo="/?star=424">Sign in</SignInLink>);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2F%3Fstar%3D424"
    );
  });

  it("links to the bare login page from the home page", () => {
    usePathname.mockReturnValue("/");
    render(<SignInLink>Sign in</SignInLink>);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("does not carry an off-site destination", () => {
    usePathname.mockReturnValue("/");
    render(<SignInLink returnTo="//evil.example">Sign in</SignInLink>);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login"
    );
  });
});
