import type { ConnectedApp } from "@lymi/client/api";
import { identifyApp } from "@lymi/client/app-marks";
import { assistantOf as assistantIn, assistants, pageParams } from "@lymi/client/apps";
import { siteUrl } from "../auth/client";

/** The assistants the Apps page offers, in the strip's order with Custom MCP last. */
export const ASSISTANTS = assistants(siteUrl);

export const assistantByKey = (key: string) => ASSISTANTS.find((a) => a.key === key);

/** The assistant a connected app is, by the recognised name its client ID resolves to. */
export const assistantOf = (item: ConnectedApp) => assistantIn(ASSISTANTS, item, siteUrl);

/** The page each connected app's row opens, by grant id: its assistant's when it is the only grant for it, else its own. */
export const appPageParams = (consents: readonly ConnectedApp[]) =>
  pageParams(ASSISTANTS, consents, siteUrl);

/** A connected app as its client ID identifies it, never by the logo it sent. */
export const identityOf = (item: ConnectedApp) => identifyApp(item.clientId, item.name, siteUrl);
