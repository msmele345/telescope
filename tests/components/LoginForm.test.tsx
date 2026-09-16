import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const requestCode = vi.fn();
const verifyCode = vi.fn();

vi.mock("@/app/actions/auth", () => ({
  requestCode: (...args: unknown[]) => requestCode(...args),
  verifyCode: (...args: unknown[]) => verifyCode(...args),
}));

import LoginForm from "@/components/LoginForm";

/** Walk the form from email entry to code entry with a successful request. */
async function advanceToCodeEntry(
  user: ReturnType<typeof userEvent.setup>,
  email = "ada@example.com"
) {
  requestCode.mockResolvedValue({ status: "sent" });
  await user.type(screen.getByLabelText(/email address/i), email);
  await user.click(screen.getByRole("button", { name: /email me a code/i }));
  return screen.findByLabelText(/six-digit code/i);
}

describe("<LoginForm />", () => {
  beforeEach(() => {
    requestCode.mockReset();
    verifyCode.mockReset();
  });

  it("advances to code entry and names the address it was sent to", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await advanceToCodeEntry(user);

    expect(requestCode).toHaveBeenCalledWith("ada@example.com");
    expect(screen.getByText(/ada@example\.com/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/email address/i)).toBeNull();
  });

  it("submits the entered code to verifyCode", async () => {
    const user = userEvent.setup();
    verifyCode.mockResolvedValue({ status: "ok" });
    render(<LoginForm />);

    const codeInput = await advanceToCodeEntry(user);
    await user.type(codeInput, "123456");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(verifyCode).toHaveBeenCalledWith("ada@example.com", "123456");
  });

  it("accepts a pasted code, preserving a leading zero", async () => {
    const user = userEvent.setup();
    verifyCode.mockResolvedValue({ status: "ok" });
    render(<LoginForm />);

    const codeInput = await advanceToCodeEntry(user);
    await user.click(codeInput);
    await user.paste("012345");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(verifyCode).toHaveBeenCalledWith("ada@example.com", "012345");
  });

  it("rejects an email the server will not accept", async () => {
    const user = userEvent.setup();
    requestCode.mockResolvedValue({ status: "invalidEmail" });
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "not-an-email@x");
    await user.click(screen.getByRole("button", { name: /email me a code/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /valid email address/i
    );
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it("reports how long to wait when rate limited", async () => {
    const user = userEvent.setup();
    requestCode.mockResolvedValue({
      status: "rateLimited",
      retryAfterSeconds: 45,
    });
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "ada@example.com");
    await user.click(screen.getByRole("button", { name: /email me a code/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/45 seconds/i);
  });

  it("rounds a long rate-limit wait to minutes", async () => {
    const user = userEvent.setup();
    requestCode.mockResolvedValue({
      status: "rateLimited",
      retryAfterSeconds: 1800,
    });
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "ada@example.com");
    await user.click(screen.getByRole("button", { name: /email me a code/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/30 minutes/i);
  });

  it("reports a wrong code with the attempts remaining", async () => {
    const user = userEvent.setup();
    verifyCode.mockResolvedValue({ status: "wrong", attemptsRemaining: 3 });
    render(<LoginForm />);

    const codeInput = await advanceToCodeEntry(user);
    await user.type(codeInput, "111111");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/3 attempts remaining/i);
  });

  it("reports an expired code distinctly from a wrong one", async () => {
    const user = userEvent.setup();
    verifyCode.mockResolvedValue({ status: "expired" });
    render(<LoginForm />);

    const codeInput = await advanceToCodeEntry(user);
    await user.type(codeInput, "111111");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/expired/i);
    expect(alert).not.toHaveTextContent(/attempts remaining/i);
  });

  it("reports a locked-out code distinctly", async () => {
    const user = userEvent.setup();
    verifyCode.mockResolvedValue({ status: "locked" });
    render(<LoginForm />);

    const codeInput = await advanceToCodeEntry(user);
    await user.type(codeInput, "111111");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/too many incorrect attempts/i);
    expect(alert).not.toHaveTextContent(/attempts remaining/i);
  });

  it("offers a way back to correct a mistyped address", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await advanceToCodeEntry(user, "ada@exmaple.com");
    await user.click(screen.getByRole("button", { name: /wrong address/i }));

    const emailInput = await screen.findByLabelText(/email address/i);
    expect(emailInput).toHaveValue("ada@exmaple.com");
    expect(screen.queryByLabelText(/six-digit code/i)).toBeNull();
  });

  it("re-requests a code from the resend control", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await advanceToCodeEntry(user);
    requestCode.mockClear();

    await user.click(screen.getByRole("button", { name: /send a new code/i }));

    expect(requestCode).toHaveBeenCalledWith("ada@example.com");
    expect(await screen.findByLabelText(/six-digit code/i)).toBeInTheDocument();
  });

  it("is operable by keyboard alone", async () => {
    const user = userEvent.setup();
    requestCode.mockResolvedValue({ status: "sent" });
    verifyCode.mockResolvedValue({ status: "ok" });
    render(<LoginForm />);

    await user.tab();
    expect(screen.getByLabelText(/email address/i)).toHaveFocus();
    await user.keyboard("ada@example.com{Enter}");

    const codeInput = await screen.findByLabelText(/six-digit code/i);
    await user.tab();
    expect(codeInput).toHaveFocus();
    await user.keyboard("123456{Enter}");

    expect(verifyCode).toHaveBeenCalledWith("ada@example.com", "123456");
  });
});
