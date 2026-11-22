import { CURSOR_CLIENT_PATH, GEMINI_CLI_CLIENT_PATH, GROK_CLIENT_PATH } from "@lymi/core";
import type { ApiKeySummary, ConnectedApp } from "./api";
import { type AppIdentity, identifyApp } from "./app-marks";

export type AssistantKey = "claude" | "chatgpt" | "gemini" | "grok" | "cursor" | "custom";

export type Assistant = {
  key: AssistantKey;
  app: AppIdentity | null;
  open: string | null;
  clientId: string | null;
  guide: string;
};

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

export function assistantOf(
  list: readonly Assistant[],
  item: ConnectedApp,
  site: (path: string) => string,
): Assistant | undefined {
  const name = identifyApp(item.clientId, item.name, site).name;
  const key = name === "Gemini CLI" ? "gemini" : name?.toLowerCase();
  return list.find((a) => a.key !== "custom" && a.key === key);
}

export function pageParams(
  list: readonly Assistant[],
  consents: readonly ConnectedApp[],
  site: (path: string) => string,
): Map<string, string> {
  const keyed = consents.map((item) => [item, assistantOf(list, item, site)?.key] as const);
  const count = new Map<string, number>();
  for (const [, key] of keyed) if (key) count.set(key, (count.get(key) ?? 0) + 1);
  return new Map(
    keyed.map(([item, key]) => [item.id, key && count.get(key) === 1 ? key : item.id]),
  );
}

export const YOMITAN_KEY_NAME = "Yomitan";

export const YOMITAN_ACTIVITY_APP = `anki-connect:${YOMITAN_KEY_NAME}`;

export function yomitanKey(keys: readonly ApiKeySummary[] | undefined): ApiKeySummary | null {
  const named = (keys ?? []).filter((k) => k.name === YOMITAN_KEY_NAME);
  return named.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export const BUILT_IN_APPS: Readonly<Record<string, string>> = {
  readwise: "Readwise",
  [YOMITAN_ACTIVITY_APP]: "Yomitan",
};
