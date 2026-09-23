import { z } from "zod";

/** What `/api/live` sends a tab. It names no resource, so a tab refetches whatever it shows. */
export const LiveMessage = z.object({ type: z.literal("changed") });
export type LiveMessage = z.infer<typeof LiveMessage>;

/** The tab id every request carries, so the channel does not echo a tab's own writes to it. */
export const LIVE_TAB_HEADER = "x-lymi-tab";

/** Keepalives the channel answers without waking. */
export const LIVE_PING = "ping";
export const LIVE_PONG = "pong";
