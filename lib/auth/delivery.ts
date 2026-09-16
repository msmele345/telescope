/**
 * Delivering the code to the person who asked for it.
 *
 * With no mail provider configured the code goes to the server log, so a
 * fresh clone can sign in immediately without provisioning anything. Real
 * delivery lands in a later ticket; this is the seam it slots into.
 */
export async function deliverCode(email: string, code: string): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    // A provider is configured but nothing here can send through it yet.
    // Falling back to the log would write live sign-in codes into the
    // deployment's log stream, so refuse instead.
    throw new Error(
      "RESEND_API_KEY is set but email delivery is not implemented yet. " +
        "Unset it to fall back to logging the code in development."
    );
  }

  console.log(
    `\n  Telescope sign-in code for ${email}: ${code}\n  (valid for 10 minutes)\n`
  );
}
