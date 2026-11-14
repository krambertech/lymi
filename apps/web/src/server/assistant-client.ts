import { identifyApp } from "@lymi/client/app-marks";
import type { ASSISTANT_CLIENTS } from "@lymi/core/analytics";
import { DEFAULT_PUBLIC_SITE_ORIGIN } from "../shared/origins";

export type AssistantClient = (typeof ASSISTANT_CLIENTS)[number];

const BY_NAME: Record<string, AssistantClient> = {
  ChatGPT: "chatgpt",
  Claude: "claude",
  Codex: "codex",
  Cursor: "cursor",
  Gemini: "gemini",
  "Gemini CLI": "gemini_cli",
  Grok: "grok",
  Zed: "zed",
};

/**
 * The analytics label for an OAuth client: its recognised mark, else `other`, so an unknown
 * client's own host or name never reaches PostHog.
 */
export function assistantClientOf(
  clientId: string | null | undefined,
  publicSiteUrl: string | undefined,
): AssistantClient {
  const site = publicSiteUrl ?? DEFAULT_PUBLIC_SITE_ORIGIN;
  const app = identifyApp(clientId ?? undefined, null, (path) => new URL(path, site).toString());
  return (app.recognised && app.name && BY_NAME[app.name]) || "other";
}
