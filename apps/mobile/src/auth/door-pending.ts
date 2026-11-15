/** What the door is waiting on. One at a time, so a resend never lands on a confirm under way. */
export type Pending = "apple" | "google" | "form" | "resend";

/** The door taken for `on`, or null when something else already holds it. */
export function claim(current: Pending | null, on: Pending): Pending | null {
  return current === null ? on : null;
}

/** The door after `on` finishes: free if `on` held it, otherwise unchanged. */
export function release(current: Pending | null, on: Pending): Pending | null {
  return current === on ? null : current;
}
