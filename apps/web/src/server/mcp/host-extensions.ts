import type { AppLanguage } from "@lymi/core";
import {
  type CallToolResult,
  type McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import type { McpView } from "../../shared/mcp-app";
import type { CardView } from "../services";
import {
  getDeck,
  getSettings,
  listDeckCards,
  listDecks,
  reviewRounds,
  searchCards,
  showCardWithDiagnosis,
  updateSettings,
} from "../services";
import type { ServiceContext } from "../services/context";

/** The settings ChatGPT draws natively are named by these tools. */
export const SETTINGS_READ_TOOL = "settings_read";
export const SETTINGS_UPDATE_TOOL = "settings_update";

/** Server capabilities that announce the host extensions below, under both spec versions' keys. */
export const HOST_EXTENSION_CAPABILITIES = {
  experimental: {
    "openai/settings": { readTool: SETTINGS_READ_TOOL, updateTool: SETTINGS_UPDATE_TOOL },
  },
  extensions: {
    "openai/settings": { readTool: SETTINGS_READ_TOOL, updateTool: SETTINGS_UPDATE_TOOL },
  },
};

/** How many of the newest cards the home shows, and how many of each kind a mention offers. */
const HOME_RECENT = 10;
const MENTIONS_PER_KIND = 6;

/** The app language as a learner reads it, since a native settings control shows enum values as written. */
const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: "English",
  uk: "Українська",
  ru: "Русский",
};

export interface ToolKit {
  run: (tool: string, fn: () => Promise<CallToolResult>) => Promise<CallToolResult>;
  result: (structured: Record<string, unknown>) => CallToolResult;
  requireWrite: () => void;
  readMeta: Record<string, unknown>;
  writeMeta: Record<string, unknown>;
  viewUri: (view: McpView) => string;
  cardOut: (card: CardView) => Record<string, unknown>;
}

const appOnly = { visibility: ["app"] };

const Count = z.number().int();
const HomeOut = z.object({
  dueNow: Count,
  total: Count,
  decks: z.array(z.object({ id: z.string(), name: z.string(), due: Count, total: Count })),
  series: z.array(z.never()),
  rounds: z.object({ forgotten: Count, new: Count, slipping: Count }),
  recent: z.array(z.looseObject({ id: z.string(), term: z.string(), deckName: z.string() })),
});
const MentionsOut = z.object({
  items: z.array(
    z.object({
      type: z.literal("resource_link"),
      uri: z.string(),
      name: z.string(),
      description: z.string(),
      mimeType: z.string(),
    }),
  ),
});
const SettingsReadOut = z.object({
  schema: z.record(z.string(), z.unknown()),
  values: z.record(z.string(), z.unknown()),
});

/**
 * What ChatGPT adds beyond MCP Apps (ADR 0026): a home in its sidebar and beside each
 * conversation, @-mentions of decks and cards, and the app language as a native setting.
 * Other hosts ignore the `openai/*` keys; the card and deck resources serve any host that
 * lets a learner attach a resource, such as Claude Code.
 */
export function registerHostExtensions(server: McpServer, ctx: ServiceContext, kit: ToolKit): void {
  server.registerTool(
    "open_lymi",
    {
      title: "Lymi",
      description:
        "Lymi's home inside the assistant: what is due and the newest cards. The learner opens it from the sidebar or beside a conversation.",
      inputSchema: z.object({}),
      outputSchema: HomeOut,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      _meta: {
        ...kit.readMeta,
        ui: { resourceUri: kit.viewUri("home"), ...appOnly },
        "openai/ui": {
          entrypoints: [{ type: "global" }, { type: "thread" }],
          preferredDisplayMode: "fullscreen",
          availableDisplayModes: ["fullscreen", "inline"],
        },
      },
    },
    () =>
      kit.run("open_lymi", async () => {
        const [decks, rounds, recent] = await Promise.all([
          listDecks(ctx),
          reviewRounds(ctx),
          searchCards(ctx, { limit: HOME_RECENT }),
        ]);
        return kit.result({
          dueNow: decks.reduce((sum, d) => sum + d.due, 0),
          total: decks.reduce((sum, d) => sum + d.total, 0),
          decks: decks.map((d) => ({ id: d.id, name: d.name, due: d.due, total: d.total })),
          series: [],
          rounds,
          recent: recent.cards.map((row) => ({ ...kit.cardOut(row.card), deckName: row.deckName })),
        });
      }),
  );

  server.registerTool(
    "mention_search",
    {
      title: "Find a deck or card to mention",
      description: "Decks and cards whose name or text matches, for the learner to @-mention.",
      inputSchema: z.object({ query: z.string().trim().max(200) }),
      outputSchema: MentionsOut,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      _meta: {
        ...kit.readMeta,
        ui: appOnly,
        "openai/extensions": { "mentions/search": {} },
      },
    },
    ({ query }) =>
      kit.run("mention_search", async () => {
        const needle = query.toLocaleLowerCase();
        const [decks, cards] = await Promise.all([
          listDecks(ctx),
          query ? searchCards(ctx, { query, limit: MENTIONS_PER_KIND }) : Promise.resolve(null),
        ]);
        const items = [
          ...decks
            .filter((d) => !needle || d.name.toLocaleLowerCase().includes(needle))
            .slice(0, MENTIONS_PER_KIND)
            .map((d) => ({
              type: "resource_link" as const,
              uri: `lymi://deck/${d.id}`,
              name: d.name,
              description: `Deck, ${d.total} cards`,
              mimeType: "application/json",
            })),
          ...(cards?.cards ?? []).map((row) => ({
            type: "resource_link" as const,
            uri: `lymi://card/${row.card.id}`,
            name: row.card.term,
            description: [row.card.meaning, row.deckName].filter(Boolean).join(" · "),
            mimeType: "application/json",
          })),
        ];
        return { content: items, structuredContent: { items } };
      }),
  );

  server.registerResource(
    "Lymi card",
    new ResourceTemplate("lymi://card/{cardId}", { list: undefined }),
    {
      title: "A Lymi card",
      description: "One card with everything the learner wrote on it.",
      mimeType: "application/json",
    },
    async (uri, { cardId }) => {
      const card = await showCardWithDiagnosis(ctx, String(cardId));
      return {
        contents: [
          { uri: uri.href, mimeType: "application/json", text: JSON.stringify(kit.cardOut(card)) },
        ],
      };
    },
  );

  server.registerResource(
    "Lymi deck",
    new ResourceTemplate("lymi://deck/{deckId}", { list: undefined }),
    {
      title: "A Lymi deck",
      description: "One deck and its newest cards.",
      mimeType: "application/json",
    },
    async (uri, { deckId }) => {
      const id = String(deckId);
      const [deck, rows] = await Promise.all([getDeck(ctx, id), listDeckCards(ctx, id)]);
      const text = JSON.stringify({
        deck: { id: deck.id, name: deck.name, defaultLanguage: deck.defaultLanguage },
        total: rows.length,
        cards: rows.slice(0, 50).map((row) => kit.cardOut(row.card)),
      });
      return { contents: [{ uri: uri.href, mimeType: "application/json", text }] };
    },
  );

  server.registerTool(
    SETTINGS_READ_TOOL,
    {
      title: "Read Lymi settings",
      description: "The settings ChatGPT shows on Lymi's plugin page.",
      inputSchema: z.object({}),
      outputSchema: SettingsReadOut,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      _meta: { ...kit.readMeta, ui: appOnly },
    },
    () =>
      kit.run(SETTINGS_READ_TOOL, async () => {
        const settings = await getSettings(ctx);
        const language = (settings.appLanguage ?? "en") as AppLanguage;
        return kit.result({
          schema: {
            type: "object",
            properties: {
              appLanguage: {
                type: "string",
                title: "App language",
                description: "Lymi's interface and the language new meanings are written in.",
                enum: Object.values(LANGUAGE_NAMES),
              },
            },
          },
          values: { appLanguage: LANGUAGE_NAMES[language] ?? LANGUAGE_NAMES.en },
        });
      }),
  );

  server.registerTool(
    SETTINGS_UPDATE_TOOL,
    {
      title: "Change Lymi settings",
      description: "Saves a setting the learner changed on Lymi's plugin page.",
      inputSchema: z.object({
        set: z.object({ appLanguage: z.enum(Object.values(LANGUAGE_NAMES)).optional() }),
      }),
      outputSchema: z.object({ ok: z.literal(true) }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: { ...kit.writeMeta, ui: appOnly },
    },
    ({ set }) =>
      kit.run(SETTINGS_UPDATE_TOOL, async () => {
        kit.requireWrite();
        const appLanguage = (Object.keys(LANGUAGE_NAMES) as AppLanguage[]).find(
          (code) => LANGUAGE_NAMES[code] === set.appLanguage,
        );
        if (appLanguage) await updateSettings(ctx, { appLanguage });
        return kit.result({ ok: true });
      }),
  );
}
