/**
 * Delivering the code to the person who asked for it.
 *
 * In development there is no mail service to provision: the code goes to the
 * server log, so a fresh clone can sign in immediately. Real delivery lands
 * in a later ticket; this is the seam it will slot into.
 */
export async function deliverCode(email: string, code: string): Promise<void> {
  console.log(
    `\n  Telescope sign-in code for ${email}: ${code}\n  (valid for 10 minutes)\n`
  );
}
