import { CURSOR_CLIENT_PATH, GEMINI_CLI_CLIENT_PATH, GROK_CLIENT_PATH } from "@lymi/core";
import { type AppIdentity, identifyApp } from "../components/app-mark";
import type { ConnectedApp } from "./api";
import { publicSiteUrl } from "./origins";

/** The assistants Settings offers to connect, each with a page at `/settings/apps/<key>`. */
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

export const ASSISTANTS: readonly Assistant[] = [
  {
    key: "claude",
    app: identifyApp("https://claude.ai/"),
    open: "https://claude.ai/settings/connectors",
    clientId: null,
    guide: "/docs/mcp/claude",
  },
  {
    key: "chatgpt",
    app: identifyApp("https://chatgpt.com/"),
    open: "https://chatgpt.com/#settings/Connectors",
    clientId: null,
    guide: "/docs/mcp/chatgpt",
  },
  {
    key: "gemini",
    app: identifyApp("https://accountlinking.google.com/"),
    open: null,
    clientId: publicSiteUrl(GEMINI_CLI_CLIENT_PATH),
    guide: "/docs/mcp/gemini",
  },
  {
    key: "grok",
    app: identifyApp("https://grok.com/"),
    open: "https://grok.com/connectors",
    clientId: publicSiteUrl(GROK_CLIENT_PATH),
    guide: "/docs/mcp/grok",
  },
  {
    key: "cursor",
    app: identifyApp("https://cursor.com/"),
    open: null,
    clientId: publicSiteUrl(CURSOR_CLIENT_PATH),
    guide: "/docs/mcp/cursor",
  },
  { key: "custom", app: null, open: null, clientId: null, guide: "/docs/mcp" },
];

export const assistantByKey = (key: string) => ASSISTANTS.find((a) => a.key === key);

/** The assistant a connected app is, by the recognised name its client ID resolves to. */
export function assistantOf(item: ConnectedApp): Assistant | undefined {
  const name = identifyApp(item.clientId, item.name).name;
  const key = name === "Gemini CLI" ? "gemini" : name?.toLowerCase();
  return ASSISTANTS.find((a) => a.key !== "custom" && a.key === key);
}

/** The page a connected app's row opens: its assistant's when Lymi knows it, else its own. */
export const appPageParam = (item: ConnectedApp) => assistantOf(item)?.key ?? item.id;
