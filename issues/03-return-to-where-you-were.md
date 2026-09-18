# Ticket 3: Return to where you were after signing in

> Source spec: `plans/v2-lightweight-auth.md`

**What to build:** A visitor who clicks "sign in to save this" from a constellation page is
currently deposited on the home page afterwards, having lost their place. Sign-in prompts pass
their current location along, and a successful verification returns the visitor there. The
prompts are the header sign-in link, the favorite button, the mark-viewed/read toggle, and the
profile page's redirect for unauthenticated visitors.

**Only relative, same-origin paths are accepted.** Anything absolute, protocol-relative, or
otherwise parsing as off-site is discarded in favour of the default destination. This is the
standard open-redirect defence and is required rather than optional: a login route that forwards
to an attacker-supplied URL *after* authenticating someone is a phishing primitive.

**Blocked by:** #2 Email-code sign-in, end to end, in local dev.

- [ ] Signing in from a constellation page, a star popup, or the profile redirect returns the visitor to where they were.
- [ ] A relative destination is carried through the whole two-step flow, including across a resend.
- [ ] An absolute or off-site destination is discarded in favour of the default, and cannot be used to forward a freshly authenticated visitor off-site.
- [ ] Component tests cover both the carried-through and the discarded case.
