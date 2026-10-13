import { type Href, useRouter } from "expo-router";
import { useEffect } from "react";

// A link that arrives while signed out, such as a widget's, is refused by the signed-in guard and
// would be lost at the door. It is held here and opened once the learner is in.

/** The places a link may open after sign-in; anything else, such as the auth screens, is let go. */
const PLACES = /^\/(review|capture|library|today|explore|you|search|streak|join|add)(?=[/?#]|$)/;

let last: { path: string; at: number } | null = null;
let atDoor = false;
let held: { path: string; at: number } | null = null;

/** A held link older than this is let go: an hour on, it is not what the learner came for. */
const KEEP_MS = 60 * 60_000;

function routePath(url: string): string {
  // A universal link names the site before the route; the app's own scheme names none.
  if (/^https?:\/\//i.test(url)) return url.replace(/^https?:\/\/[^/?#]*/i, "") || "/";
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "/").replace(/^\/{2,}/, "/");
}

export function noteLink(url: string) {
  const path = routePath(url);
  if (!PLACES.test(path)) return;
  last = { path, at: Date.now() };
  if (atDoor) held = last;
}

/**
 * Mounted with the signed-out screens: a link that brought the app here a moment ago, or one that
 * arrives while they show, is held for after sign-in.
 */
export function useHoldLinks() {
  useEffect(() => {
    atDoor = true;
    // Mounting here is also a sign-out, which lets go of whatever an earlier visit held.
    held = last && Date.now() - last.at < 5_000 ? last : null;
    return () => {
      atDoor = false;
    };
  }, []);
}

/** Mounted with the signed-in tabs: opens a held link once, over Today. */
export function useOpenHeldLink() {
  const router = useRouter();
  useEffect(() => {
    const link = held;
    held = null;
    if (link && Date.now() - link.at < KEEP_MS) router.push(link.path as Href);
  }, [router]);
}
