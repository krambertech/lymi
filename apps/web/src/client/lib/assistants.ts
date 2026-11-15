import {
  type Assistant,
  type AssistantKey,
  assistantOf as assistantIn,
  assistants,
  pageParams,
} from "@lymi/client/apps";
import type { ConnectedApp } from "./api";
import { publicSiteUrl } from "./origins";

export type { Assistant, AssistantKey };

/** The assistants Settings offers to connect, each with a page at `/settings/apps/<key>`. */
export const ASSISTANTS = assistants(publicSiteUrl);

export const assistantByKey = (key: string) => ASSISTANTS.find((a) => a.key === key);

/** The assistant a connected app is, by the recognised name its client ID resolves to. */
export const assistantOf = (item: ConnectedApp) => assistantIn(ASSISTANTS, item, publicSiteUrl);

/** The page each connected app's row opens, by grant id: its assistant's when it is the only grant for it, else its own. */
export const appPageParams = (consents: readonly ConnectedApp[]) =>
  pageParams(ASSISTANTS, consents, publicSiteUrl);
