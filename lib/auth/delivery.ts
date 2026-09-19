import { Resend } from "resend";
import { CODE_TTL_MS } from "@/lib/auth-policy";

/**
 * Resend's shared sender, which delivers only to the Resend account owner's
 * own address. It is what makes sending correct before a domain is verified;
 * once one is, set EMAIL_FROM to an address on it.
 */
const DEFAULT_FROM = "Telescope <onboarding@resend.dev>";

export type CodeEmail = { subject: string; text: string; html: string };

function describeWindow(ttlMs: number): string {
  const minutes = Math.round(ttlMs / 60_000);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

/** The message a sign-in code travels in. The code stays a string throughout. */
export function composeCodeEmail(code: string, ttlMs: number): CodeEmail {
  const validFor = describeWindow(ttlMs);
  return {
    subject: `${code} is your Telescope sign-in code`,
    text:
      `Your Telescope sign-in code is ${code}\n\n` +
      `It is valid for ${validFor} and works once. Type it into the tab where ` +
      `you asked for it.\n\n` +
      `If you didn't try to sign in to Telescope, you can ignore this email.\n`,
    html:
      `<div style="font-family:system-ui,sans-serif;color:#0b1026;max-width:480px">` +
      `<p style="font-size:16px">Your Telescope sign-in code is</p>` +
      `<p style="font-size:32px;font-weight:700;letter-spacing:6px;font-family:ui-monospace,monospace">${code}</p>` +
      `<p>It is valid for <strong>${validFor}</strong> and works once. ` +
      `Type it into the tab where you asked for it.</p>` +
      `<p style="color:#5a6178;font-size:13px">If you didn't try to sign in to Telescope, you can ignore this email.</p>` +
      `</div>`,
  };
}

/**
 * Delivering the code to the person who asked for it.
 *
 * With RESEND_API_KEY set the code is emailed. Without it, in development,
 * the code goes to the server log so a fresh clone can sign in immediately.
 * Anywhere else a missing key is an error: logging would put live sign-in
 * codes into the deployment's log stream.
 */
export async function deliverCode(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is not set, so sign-in codes cannot be emailed. " +
          "Connect the Resend integration to this environment."
      );
    }
    console.log(
      `\n  Telescope sign-in code for ${email}: ${code}\n  (valid for ${describeWindow(CODE_TTL_MS)})\n`
    );
    return;
  }

  const { error } = await new Resend(apiKey).emails.send({
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to: email,
    ...composeCodeEmail(code, CODE_TTL_MS),
  });
  if (error) {
    throw new Error(`Resend failed to send the sign-in code: ${error.message}`);
  }
}
