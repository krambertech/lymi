import { type Href, useRouter } from "expo-router";
import { useEffect } from "react";

// A link that arrives while signed out, such as a widget's, is refused by the signed-in guard and
// would be lost at the door. It is held here and opened once the learner is in.

/** The places a link may open after sign-in; anything else, such as the auth screens, is let go. */
const PLACES = /^\/(review|capture|library|today|explore|you|search|streak)(?=[/?#]|$)/;

let last: { path: string; at: number } | null = null;
let atDoor = false;
let held: string | null = null;

/** `lymi://review?deck=1` as the router's `/review?deck=1`. */
function routePath(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "/").replace(/^\/{2,}/, "/");
}

/** Every link the system opens the app with passes here, from `+native-intent`. */
export function noteLink(url: string) {
  const path = routePath(url);
  if (!PLACES.test(path)) return;
  last = { path, at: Date.now() };
  if (atDoor) held = path;
}

/**
 * Mounted with the signed-out screens: a link that brought the app here a moment ago, or one that
 * arrives while they show, is held for after sign-in.
 */
export function useHoldLinks() {
  useEffect(() => {
    atDoor = true;
    if (last && Date.now() - last.at < 5_000) held = last.path;
    return () => {
      atDoor = false;
    };
  }, []);
}

/** Mounted with the signed-in tabs: opens a held link once, over Today. */
export function useOpenHeldLink() {
  const router = useRouter();
  useEffect(() => {
    const path = held;
    held = null;
    if (path) router.push(path as Href);
  }, [router]);
}
