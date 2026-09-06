/**
 * A note left after a successful sign-in, read while /api/me is still in flight.
 *
 * The site root is the landing page for a stranger and Today for the learner, and the
 * answer only arrives with that request. Without a hint one audience always watches the
 * other's page for a moment. This is a guess about what to paint first and never a claim
 * about who anyone is: nothing is shown or fetched on the strength of it, and the real
 * answer replaces it a moment later.
 */
const KEY = "lymi-signed-in";

export function hasSignedInBefore(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberSignedIn(yes: boolean): void {
  try {
    if (yes) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {}
}
