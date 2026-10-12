import { noteLink } from "../auth/held-link";

/** Notes each link the app opens with, so one refused while signed out still lands after sign-in. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    noteLink(path);
  } catch (e) {
    console.warn("link", e);
  }
  return path;
}
