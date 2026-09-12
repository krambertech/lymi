import type { Scope } from "@lymi/core";
import {
  CardInput,
  CardPatch,
  CardSearchInput,
  DeckInput,
  Directions,
  FieldSource,
  InsightsOut,
  SettingsPatch,
} from "@lymi/core";
import type { Card, Deck } from "@lymi/core/schema";
import { type CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  addCards,
  archiveCard,
  archiveDeck,
  createDeck,
  getCard,
  getDeck,
  getSettings,
  insights,
  listDeckCards,
  listDecks,
  restoreCard,
  restoreDeck,
  ServiceError,
  searchCards,
  updateCard,
  updateDeck,
  updateSettings,
} from "../services";
import type { ServiceContext } from "../services/context";

/** What one MCP request runs as. Built from the verified access token, never from the body. */
export interface McpPrincipal {
  ctx: ServiceContext;
  scope: Scope;
}

/** The most cards `get_deck` returns. Past that, `search_cards` narrows the list. */
export const DECK_CARD_LIMIT = 200;

const INSTRUCTIONS = `Lymi keeps one learner's vocabulary: decks of cards, each card a term with its meaning, example and pronunciation, reviewed with spaced repetition. You add and tend cards; the learner reviews them in the app, and you never grade a review.

Start with list_decks. It names the decks, their languages and the language meanings are written in.

When the learner shares a lesson, transcript or text, you do the extraction: pick the terms worth remembering, one card each, and send them in one add_cards call rather than one call per term. Write the term as it is used in the language being learned. Put the meaning in the learner's meaning language. Say where each field came from: "lesson" when it is in the material, "ai" when you wrote it. If a field is missing, leave it out rather than guessing; the learner can fill it in later.

A term already in the learner's decks is skipped, never rejected, and the result names the existing card. Re-sending the same batch is safe.

Archive is the only removal, and restore undoes it. Nothing is deleted.`;

/**
 * A fresh server per request. Stateless: tools read and write through the same service
 * layer the REST routes use, with actor "mcp", so nothing can bypass product rules and
 * every write lands in Activity.
 */
export function buildMcpServer(principal: McpPrincipal): McpServer {
  const server = new McpServer({ name: "lymi", version: "0.2.0" }, { instructions: INSTRUCTIONS });
  const { ctx } = principal;

  server.registerTool(
    "list_decks",
    {
      title: "List decks",
      description:
        "Every active deck with its card count and how many cards are due now, plus the language meanings are written in. Call this first: card adds need a deck id.",
      inputSchema: z.object({}),
      outputSchema: DecksOut,
      annotations: read,
    },
    () =>
      run(async () => {
        const [decks, settings] = await Promise.all([listDecks(ctx), getSettings(ctx)]);
        return result({
          meaningLanguage: settings.meaningLanguage,
          decks: decks.map(deckSummary),
        });
      }),
  );

  server.registerTool(
    "get_deck",
    {
      title: "Get a deck",
      description: `One deck and its active cards, newest first, up to ${DECK_CARD_LIMIT}. For a bigger deck, or to find one card, use search_cards.`,
      inputSchema: z.object({ deckId: z.string().min(1) }),
      outputSchema: DeckWithCardsOut,
      annotations: read,
    },
    ({ deckId }) =>
      run(async () => {
        const [deck, rows] = await Promise.all([getDeck(ctx, deckId), listDeckCards(ctx, deckId)]);
        return result({
          deck: deckOut(deck),
          total: rows.length,
          truncated: rows.length > DECK_CARD_LIMIT,
          cards: rows.slice(0, DECK_CARD_LIMIT).map((row) => ({
            ...cardOut(row.card),
            dueAt: row.state ? row.state.due.toISOString() : null,
          })),
        });
      }),
  );

  server.registerTool(
    "search_cards",
    {
      title: "Search cards",
      description:
        "Find cards by text in the term, meaning, example or notes, in one deck or all of them. Leave the query empty to list the newest cards. Set archived to true to look through archived cards, for example to find one to restore.",
      inputSchema: CardSearchInput,
      outputSchema: SearchOut,
      annotations: read,
    },
    (search) =>
      run(async () => {
        const rows = await searchCards(ctx, search);
        return result({
          cards: rows.map((row) => ({ ...cardOut(row.card), deckName: row.deckName })),
        });
      }),
  );

  server.registerTool(
    "get_card",
    {
      title: "Get a card",
      description: "One card by id, every field.",
      inputSchema: z.object({ cardId: z.string().min(1) }),
      outputSchema: CardOut,
      annotations: read,
    },
    ({ cardId }) => run(async () => result(cardOut(await getCard(ctx, cardId)))),
  );

  server.registerTool(
    "due_counts",
    {
      title: "Due counts",
      description:
        "How many cards are waiting to be reviewed right now, in total and per deck. Only the learner can review them, in the app.",
      inputSchema: z.object({}),
      outputSchema: DueOut,
      annotations: read,
    },
    () =>
      run(async () => {
        const decks = await listDecks(ctx);
        return result({
          dueNow: decks.reduce((sum, d) => sum + d.due, 0),
          total: decks.reduce((sum, d) => sum + d.total, 0),
          decks: decks.map((d) => ({ id: d.id, name: d.name, due: d.due, total: d.total })),
        });
      }),
  );

  server.registerTool(
    "add_cards",
    {
      title: "Add cards",
      description:
        'Add one or many cards, across any decks, in one call. A term already in the learner\'s decks is skipped, never rejected, and the result names the existing card. Fields you wrote yourself are labelled "ai" unless you say they came from the lesson, so the learner never mistakes your text for the material. Needs write.',
      inputSchema: z.object({
        cards: z
          .array(McpCardInput)
          .min(1)
          .max(200)
          .describe("Up to 200 cards. Outcomes come back in the same order."),
      }),
      outputSchema: AddCardsOut,
      annotations: { ...write, idempotentHint: true },
    },
    ({ cards }) =>
      run(async () => {
        denyReads(principal);
        const outcomes = await addCards(ctx, cards.map(withAiSourceDefaults));
        return result({
          added: outcomes.filter((o) => o.status === "added").length,
          skipped: outcomes.filter((o) => o.status === "skipped").length,
          results: outcomes.map((o) =>
            o.status === "added"
              ? { status: "added" as const, card: cardOut(o.card) }
              : {
                  status: "skipped" as const,
                  term: o.term,
                  existing: { ...cardOut(o.existing), deckName: o.deckName },
                },
          ),
        });
      }),
  );

  server.registerTool(
    "update_card",
    {
      title: "Edit a card",
      description:
        'Change fields on one card. Send only what changes; a field left out keeps its text. A meaning or example you change is labelled "ai" unless you say it came from the lesson. Setting deckId moves the card. Needs write.',
      inputSchema: z.object({ cardId: z.string().min(1) }).extend(McpCardPatch.shape),
      outputSchema: CardOut,
      annotations: { ...write, idempotentHint: true },
    },
    ({ cardId, ...patch }) =>
      run(async () => {
        denyReads(principal);
        return result(cardOut(await updateCard(ctx, cardId, withAiSourceDefaults(patch))));
      }),
  );

  server.registerTool(
    "archive_card",
    {
      title: "Archive a card",
      description:
        "Hide a card without destroying it. It leaves the deck and the review queue; restore_card brings it back with its schedule intact. Needs write.",
      inputSchema: z.object({ cardId: z.string().min(1) }),
      outputSchema: OkOut,
      annotations: { ...write, idempotentHint: true },
    },
    ({ cardId }) =>
      run(async () => {
        denyReads(principal);
        await archiveCard(ctx, cardId);
        return result({ ok: true });
      }),
  );

  server.registerTool(
    "restore_card",
    {
      title: "Restore a card",
      description:
        "Bring an archived card back, schedule and all. Find archived cards with search_cards and archived set to true. Needs write.",
      inputSchema: z.object({ cardId: z.string().min(1) }),
      outputSchema: OkOut,
      annotations: { ...write, idempotentHint: true },
    },
    ({ cardId }) =>
      run(async () => {
        denyReads(principal);
        await restoreCard(ctx, cardId);
        return result({ ok: true });
      }),
  );

  server.registerTool(
    "create_deck",
    {
      title: "Create a deck",
      description:
        "Make a new deck. Give it a default language so cards added without one inherit it. Check list_decks first: a deck for this language or lesson may exist. Needs write.",
      inputSchema: DeckInput,
      outputSchema: DeckOut,
      annotations: write,
    },
    (input) =>
      run(async () => {
        denyReads(principal);
        return result(deckOut(await createDeck(ctx, input)));
      }),
  );

  server.registerTool(
    "update_deck",
    {
      title: "Edit a deck",
      description:
        "Rename a deck, or change its description, default language or directions. Send only what changes. Needs write.",
      inputSchema: z.object({ deckId: z.string().min(1) }).extend(DeckInput.partial().shape),
      outputSchema: DeckOut,
      annotations: { ...write, idempotentHint: true },
    },
    ({ deckId, ...patch }) =>
      run(async () => {
        denyReads(principal);
        return result(deckOut(await updateDeck(ctx, deckId, patch)));
      }),
  );

  server.registerTool(
    "archive_deck",
    {
      title: "Archive a deck",
      description:
        "Hide a deck. Its cards stay and leave the review queue with it; restore_deck brings it back. Needs write.",
      inputSchema: z.object({ deckId: z.string().min(1) }),
      outputSchema: OkOut,
      annotations: { ...write, idempotentHint: true },
    },
    ({ deckId }) =>
      run(async () => {
        denyReads(principal);
        await archiveDeck(ctx, deckId);
        return result({ ok: true });
      }),
  );

  server.registerTool(
    "restore_deck",
    {
      title: "Restore a deck",
      description: "Bring an archived deck and its cards back. Needs write.",
      inputSchema: z.object({ deckId: z.string().min(1) }),
      outputSchema: OkOut,
      annotations: { ...write, idempotentHint: true },
    },
    ({ deckId }) =>
      run(async () => {
        denyReads(principal);
        await restoreDeck(ctx, deckId);
        return result({ ok: true });
      }),
  );

  server.registerTool(
    "get_settings",
    {
      title: "Get settings",
      description: "The learner's settings: the language meanings are written in.",
      inputSchema: z.object({}),
      outputSchema: SettingsOut,
      annotations: read,
    },
    () => run(async () => result(settingsOut(await getSettings(ctx)))),
  );

  server.registerTool(
    "update_settings",
    {
      title: "Change settings",
      description:
        "Change the language meanings are written in. Cards already written are not translated. Needs write.",
      inputSchema: SettingsPatch,
      outputSchema: SettingsOut,
      annotations: { ...write, idempotentHint: true },
    },
    (patch) =>
      run(async () => {
        denyReads(principal);
        return result(settingsOut(await updateSettings(ctx, patch)));
      }),
  );

  server.registerTool(
    "get_insights",
    {
      title: "Get insights",
      description:
        "How the learning is going: recall rate, days reviewed, cards by stage, the next seven days of due cards, and the cards that keep coming back. Days are bucketed in the timezone you pass.",
      inputSchema: z.object({
        period: z
          .union([z.literal(30), z.literal(90), z.literal(0)])
          .optional()
          .describe("Days the recall figure covers: 30, 90, or 0 for everything. 30 by default."),
        timezone: z
          .string()
          .min(1)
          .max(64)
          .optional()
          .describe("IANA timezone such as Europe/Tallinn. UTC by default."),
      }),
      // Rebuilt without its OpenAPI id: a schema whose JSON form is a $ref makes the SDK
      // wrap the result in { result }, and the assistant would read one level too deep.
      outputSchema: z.object(InsightsOut.shape),
      annotations: read,
    },
    ({ period, timezone }) =>
      run(async () => result(await insights(ctx, { period, zone: timezone }))),
  );

  return server;
}

const read = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const write = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

/** The consent screen let the learner untick write. The token is the source of truth. */
function denyReads(principal: McpPrincipal): void {
  if (principal.scope !== "write") {
    throw new ServiceError(
      "forbidden",
      "This connection can only read. Ask the learner to reconnect and leave write ticked on the consent screen.",
    );
  }
}

/** What a field's text can come from over MCP. "manual" is the learner's own hand, never a model's. */
const McpFieldSource = z.enum(["lesson", "ai"]);

type SourcedFields = {
  meaning?: string | undefined;
  meaningSource?: FieldSource | undefined;
  example?: string | undefined;
  exampleSource?: FieldSource | undefined;
};

/**
 * Over MCP the caller is an assistant, so a meaning or example it sends without saying
 * where it came from is its own text. Labelled "ai" so the app never shows it as the lesson's.
 * Applies to an add and to an edit alike: changing the text changes where it came from.
 */
export function withAiSourceDefaults<T extends SourcedFields>(input: T): T {
  return {
    ...input,
    ...(input.meaning !== undefined && input.meaningSource === undefined
      ? { meaningSource: "ai" as const }
      : {}),
    ...(input.example !== undefined && input.exampleSource === undefined
      ? { exampleSource: "ai" as const }
      : {}),
  };
}

/** A ServiceError is the tool's answer; anything else is a bug and surfaces as one. */
async function run(fn: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ServiceError) return failure(err.message, err.details);
    throw err;
  }
}

function result(structured: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
    structuredContent: structured,
  };
}

function failure(message: string, details?: unknown): CallToolResult {
  const text = details === undefined ? message : `${message}\n${JSON.stringify(details, null, 2)}`;
  return { isError: true, content: [{ type: "text", text }] };
}

// What crosses the wire. Dates become ISO strings; internal columns stay behind.

const Timestamp = z.iso.datetime();

const sourceFields = {
  meaningSource: McpFieldSource.optional().describe(
    '"lesson" when the meaning is in the material, "ai" when you wrote it. Defaults to "ai".',
  ),
  exampleSource: McpFieldSource.optional().describe(
    '"lesson" when the example is in the material, "ai" when you wrote it. Defaults to "ai".',
  ),
};

const McpCardInput = CardInput.extend(sourceFields);
const McpCardPatch = CardPatch.extend(sourceFields);

const CardOut = z.object({
  id: z.string(),
  deckId: z.string(),
  term: z.string(),
  meaning: z.string().nullable(),
  pronunciation: z.string().nullable(),
  example: z.string().nullable(),
  notes: z.string().nullable(),
  language: z.string().nullable(),
  tags: z.array(z.string()),
  source: z.string().nullable(),
  directions: Directions.nullable(),
  meaningSource: FieldSource.nullable(),
  exampleSource: FieldSource.nullable(),
  createdBy: z.string(),
  archivedAt: Timestamp.nullable(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});
type CardOut = z.infer<typeof CardOut>;

function cardOut(card: Card): CardOut {
  return {
    id: card.id,
    deckId: card.deckId,
    term: card.term,
    meaning: card.meaning,
    pronunciation: card.pronunciation,
    example: card.example,
    notes: card.notes,
    language: card.language,
    tags: card.tags,
    source: card.source,
    directions: card.directions,
    meaningSource: card.meaningSource,
    exampleSource: card.exampleSource,
    createdBy: card.createdBy,
    archivedAt: card.archivedAt ? card.archivedAt.toISOString() : null,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

const DeckOut = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  defaultLanguage: z.string().nullable(),
  directions: Directions,
  archivedAt: Timestamp.nullable(),
  createdAt: Timestamp,
});
type DeckOut = z.infer<typeof DeckOut>;

function deckOut(deck: Deck): DeckOut {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    defaultLanguage: deck.defaultLanguage,
    directions: deck.directions,
    archivedAt: deck.archivedAt ? deck.archivedAt.toISOString() : null,
    createdAt: deck.createdAt.toISOString(),
  };
}

const SettingsOut = z.object({
  meaningLanguage: z.string().describe("The language meanings are written in"),
});

function settingsOut(settings: Awaited<ReturnType<typeof getSettings>>) {
  return { meaningLanguage: settings.meaningLanguage };
}

const DeckSummaryOut = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  defaultLanguage: z.string().nullable(),
  directions: Directions,
  total: z.number().int(),
  due: z.number().int(),
});

function deckSummary(deck: Awaited<ReturnType<typeof listDecks>>[number]) {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    defaultLanguage: deck.defaultLanguage,
    directions: deck.directions,
    total: deck.total,
    due: deck.due,
  };
}

const DecksOut = z.object({
  meaningLanguage: z.string().describe("The language meanings are written in"),
  decks: z.array(DeckSummaryOut),
});

const DeckWithCardsOut = z.object({
  deck: DeckOut,
  total: z.number().int(),
  truncated: z.boolean().describe(`True when the deck has more than ${DECK_CARD_LIMIT} cards`),
  cards: z.array(CardOut.extend({ dueAt: Timestamp.nullable() })),
});

const SearchOut = z.object({ cards: z.array(CardOut.extend({ deckName: z.string() })) });

const DueOut = z.object({
  dueNow: z.number().int(),
  total: z.number().int(),
  decks: z.array(
    z.object({ id: z.string(), name: z.string(), due: z.number().int(), total: z.number().int() }),
  ),
});

const AddCardsOut = z.object({
  added: z.number().int(),
  skipped: z.number().int(),
  results: z.array(
    z.discriminatedUnion("status", [
      z.object({ status: z.literal("added"), card: CardOut }),
      z.object({
        status: z.literal("skipped"),
        term: z.string(),
        existing: CardOut.extend({ deckName: z.string() }),
      }),
    ]),
  ),
});

const OkOut = z.object({ ok: z.literal(true) });
