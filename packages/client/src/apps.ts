import { CURSOR_CLIENT_PATH, GEMINI_CLI_CLIENT_PATH, GROK_CLIENT_PATH } from "@lymi/core";
import type { ApiKeySummary, ConnectedApp } from "./api";
import { type AppIdentity, identifyApp } from "./app-marks";

/** The assistants the Apps group offers to connect, each with its own page. docs/design/app-pages.md. */
export type AssistantKey = "claude" | "chatgpt" | "gemini" | "grok" | "cursor" | "custom";

export type Assistant = {
  key: AssistantKey;
  /** Null for Custom MCP, which is any app. */
  app: AppIdentity | null;
  /** Where the learner adds Lymi in the other app, when it has a web page for it. */
  open: string | null;
  /** The client ID document Lymi publishes for an app that cannot identify itself. */
  clientId: string | null;
  guide: string;
};

/** Every assistant in the order the strip shows them, with Custom MCP last; `site` is the public site's URL for a path. */
export function assistants(site: (path: string) => string): readonly Assistant[] {
  const app = (clientId: string) => identifyApp(clientId, null, site);
  return [
    {
      key: "claude",
      app: app("https://claude.ai/"),
      open: "https://claude.ai/settings/connectors",
      clientId: null,
      guide: "/docs/mcp/claude",
    },
    {
      key: "chatgpt",
      app: app("https://chatgpt.com/"),
      open: "https://chatgpt.com/#settings/Connectors",
      clientId: null,
      guide: "/docs/mcp/chatgpt",
    },
    {
      key: "gemini",
      app: app("https://accountlinking.google.com/"),
      open: null,
      clientId: site(GEMINI_CLI_CLIENT_PATH),
      guide: "/docs/mcp/gemini",
    },
    {
      key: "grok",
      app: app("https://grok.com/"),
      open: "https://grok.com/connectors",
      clientId: site(GROK_CLIENT_PATH),
      guide: "/docs/mcp/grok",
    },
    {
      key: "cursor",
      app: app("https://cursor.com/"),
      open: null,
      clientId: site(CURSOR_CLIENT_PATH),
      guide: "/docs/mcp/cursor",
    },
    { key: "custom", app: null, open: null, clientId: null, guide: "/docs/mcp" },
  ];
}

/** The assistant a connected app is, by the recognised name its client ID resolves to. */
export function assistantOf(
  list: readonly Assistant[],
  item: ConnectedApp,
  site: (path: string) => string,
): Assistant | undefined {
  const name = identifyApp(item.clientId, item.name, site).name;
  const key = name === "Gemini CLI" ? "gemini" : name?.toLowerCase();
  return list.find((a) => a.key !== "custom" && a.key === key);
}

/** The name the Apps group gives the key it makes for Yomitan, so the row and the page can find it. */
export const YOMITAN_KEY_NAME = "Yomitan";

/** The audit client the server records a Yomitan key's AnkiConnect writes under, for its Activity. */
export const YOMITAN_ACTIVITY_APP = `anki-connect:${YOMITAN_KEY_NAME}`;

/** The newest key named for Yomitan, which is the one Yomitan most likely holds. */
export function yomitanKey(keys: readonly ApiKeySummary[] | undefined): ApiKeySummary | null {
  const named = (keys ?? []).filter((k) => k.name === YOMITAN_KEY_NAME);
  return named.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

/** Names for the apps Lymi runs itself, so Activity filtered to one with no rows yet still says whose it is. */
export const BUILT_IN_APPS: Readonly<Record<string, string>> = {
  readwise: "Readwise",
  [YOMITAN_ACTIVITY_APP]: "Yomitan",
};
