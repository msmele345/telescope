"use client";

import { useState, useTransition } from "react";
import { requestCode, verifyCode } from "@/app/actions/auth";

type Step = "email" | "code";

export default function LoginForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send(address: string, resent: boolean) {
    startTransition(async () => {
      const result = await requestCode(address);
      if (result.status === "invalidEmail") {
        setError("Enter a valid email address.");
        return;
      }
      if (result.status === "rateLimited") {
        setError(
          `Too many code requests for that address. Try again in ${formatWait(
            result.retryAfterSeconds
          )}.`
        );
        return;
      }
      setError(null);
      setCode("");
      // Display and verify against the address the code actually went to.
      setEmail(result.email);
      setNotice(resent ? "A new code is on its way." : null);
      setStep("code");
    });
  }

  if (step === "email") {
    return (
      <form
        style={formStyle}
        onSubmit={(e) => {
          e.preventDefault();
          send(email, false);
        }}
      >
        <label htmlFor="email" style={labelStyle}>
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
          style={inputStyle}
        />
        {error && (
          <p role="alert" style={errorStyle}>
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} style={primaryButtonStyle}>
          {pending ? "Sending…" : "Email me a code"}
        </button>
        <p style={hintStyle}>
          We’ll send a six-digit code. No password required.
        </p>
      </form>
    );
  }

  return (
    <form
      style={formStyle}
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await verifyCode(email, code);
          setNotice(null);
          if (result.status === "wrong") {
            setError(
              `That code is not right. ${formatAttempts(
                result.attemptsRemaining
              )} remaining.`
            );
          } else if (result.status === "expired") {
            setError("That code has expired. Send yourself a new one.");
          } else if (result.status === "locked") {
            setError(
              "Too many incorrect attempts. This code is no longer usable — send yourself a new one."
            );
          } else if (result.status === "invalidEmail") {
            setError("Enter a valid email address.");
          }
        });
      }}
    >
      <p style={sentToStyle}>
        Enter the six-digit code we sent to <strong>{email}</strong>.
      </p>
      <label htmlFor="code" style={labelStyle}>
        Six-digit code
      </label>
      <input
        id="code"
        name="code"
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        style={codeInputStyle}
      />
      {error && (
        <p role="alert" style={errorStyle}>
          {error}
        </p>
      )}
      {notice && !error && (
        <p role="status" style={noticeStyle}>
          {notice}
        </p>
      )}
      <button type="submit" disabled={pending} style={primaryButtonStyle}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <div style={secondaryRowStyle}>
        <button
          type="button"
          disabled={pending}
          style={linkButtonStyle}
          onClick={() => {
            setError(null);
            setNotice(null);
            setStep("email");
          }}
        >
          Wrong address?
        </button>
        <button
          type="button"
          disabled={pending}
          style={linkButtonStyle}
          onClick={() => send(email, true)}
        >
          Send a new code
        </button>
      </div>
    </form>
  );
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function formatAttempts(n: number): string {
  return `${n} attempt${n === 1 ? "" : "s"}`;
}

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#98a6c9",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  background: "rgba(0,0,0,0.4)",
  color: "#e5ecff",
  border: "1px solid rgba(120, 150, 220, 0.3)",
  borderRadius: 8,
  fontSize: 14,
};

const codeInputStyle: React.CSSProperties = {
  ...inputStyle,
  fontSize: 22,
  letterSpacing: "0.35em",
  fontVariantNumeric: "tabular-nums",
};

const primaryButtonStyle: React.CSSProperties = {
  marginTop: 4,
  padding: "12px 16px",
  background: "#fff",
  color: "#111",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const linkButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: 0,
  color: "#9ec0ff",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
  textDecoration: "underline",
};

const secondaryRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 8,
};

const sentToStyle: React.CSSProperties = {
  margin: "0 0 4px",
  color: "#98a6c9",
  fontSize: 14,
};

const hintStyle: React.CSSProperties = {
  margin: "4px 0 0",
  color: "#7e8aac",
  fontSize: 12,
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  padding: "10px 12px",
  background: "rgba(220, 100, 100, 0.12)",
  border: "1px solid rgba(220, 100, 100, 0.3)",
  borderRadius: 8,
  color: "#ffd5d5",
  fontSize: 13,
};

const noticeStyle: React.CSSProperties = {
  margin: 0,
  padding: "10px 12px",
  background: "rgba(120, 200, 150, 0.12)",
  border: "1px solid rgba(120, 200, 150, 0.3)",
  borderRadius: 8,
  color: "#cfeedd",
  fontSize: 13,
};
