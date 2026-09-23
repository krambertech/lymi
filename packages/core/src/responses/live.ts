import { z } from "zod";

/**
 * What `/api/live` sends a tab. `version` counts the learner's changes: `hello` greets a tab with
 * it, `changed` means another tab or device wrote, and `version` is the count after this tab's
 * own write. None names a resource, so a tab refetches whatever it shows. ADR 0024.
 */
export const LiveMessage = z.object({
  type: z.enum(["hello", "changed", "version"]),
  version: z.number().int().nonnegative(),
});
export type LiveMessage = z.infer<typeof LiveMessage>;

/** The tab id every request carries, so the channel does not echo a tab's own writes to it. */
export const LIVE_TAB_HEADER = "x-lymi-tab";

/** A tab id: what `crypto.randomUUID` or its fallback makes, and short enough for a socket tag. */
export const LiveTab = z.string().regex(/^[A-Za-z0-9-]{1,64}$/);

/** Keepalives the channel answers without waking. */
export const LIVE_PING = "ping";
export const LIVE_PONG = "pong";
