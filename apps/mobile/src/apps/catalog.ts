import type { ConnectedApp } from "@lymi/client/api";
import { identifyApp } from "@lymi/client/app-marks";
import { assistantOf as assistantIn, assistants } from "@lymi/client/apps";
import { siteUrl } from "../auth/client";

/** The assistants the Apps page offers, in the strip's order with Custom MCP last. */
export const ASSISTANTS = assistants(siteUrl);

export const assistantByKey = (key: string) => ASSISTANTS.find((a) => a.key === key);

/** The assistant a connected app is, by the recognised name its client ID resolves to. */
export const assistantOf = (item: ConnectedApp) => assistantIn(ASSISTANTS, item, siteUrl);

/** The page a connected app's row opens: its assistant's when Lymi knows it, else its own. */
export const appPageParam = (item: ConnectedApp) => assistantOf(item)?.key ?? item.id;

/** A connected app as its client ID identifies it, never by the logo it sent. */
export const identityOf = (item: ConnectedApp) => identifyApp(item.clientId, item.name, siteUrl);
