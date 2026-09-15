import type { Scope } from "@lymi/core";
import {
  AppLanguage,
  CardImageImportInput,
  CardImagePatch,
  CardInput,
  CardPatch,
  CardSearchInput,
  DeckInput,
  Directions,
  FieldSource,
  IMAGE_LIMITS,
  ImageDescription,
  InsightsOut,
  ReviewMode,
  RoundsOut,
  SectionArchiveInput,
  SectionInput,
  SectionOrderInput,
  SeriesArchiveInput,
  SeriesInput,
  SeriesOrderInput,
  SettingsPatch,
  SLIPPING_LAPSES,
  SLIPPING_REVIEWS,
  StreakOut,
} from "@lymi/core";
import { type CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  addCards,
  archiveCard,
  archiveCardImage,
  archiveDeck,
  archiveSection,
  archiveSeries,
  type CardView,
  createDeck,
  createSection,
  createSeries,
  describeCardImage,
  getDeck,
  getSeries,
  getSettings,
  importCardImage,
  insights,
  listDeckCards,
  listDecks,
  listSections,
  listSeries,
  renameSection,
  renameSeries,
  reorderSections,
  reorderSeries,
  restoreCard,
  restoreCardImage,
  restoreDeck,
  restoreSection,
  restoreSeries,
  reviewRounds,
  ServiceError,
  searchCards,
  setCardsSection,
  setSeriesDecks,
  showCard,
  streak,
  updateCard,
  updateDeck,
  updateSettings,
  uploadCardImage,
} from "../services";
import type { CardImageStorage } from "../services/card-images";
import type { ServiceContext } from "../services/context";

/** What one MCP request runs as. Built from the verified access token, never from the body. */
export interface McpPrincipal {
  ctx: ServiceContext;
  scope: Scope;
  /** Named in the step-up challenge when a read-only connection tries to write. */
  resourceMetadataUrl: string;
  /** Picture storage and processing, missing where the Worker has no bindings. */
  images?: CardImageStorage | undefined;
}

/** The most cards `get_deck` returns. Past that, `search_cards` narrows the list. */
export const DECK_CARD_LIMIT = 200;

const INSTRUCTIONS = `Lymi keeps one learner's vocabulary: decks of cards, each card a term with its meaning, example and pronunciation, reviewed with spaced repetition. You add and tend cards; the learner reviews them in the app, and you never grade a review.

Start with list_decks. It names the decks, their languages and the language meanings are written in.

When the learner shares a lesson, transcript or text, you do the extraction: pick the terms worth remembering, one card each, and send them in one add_cards call rather than one call per term. Write the term as it is used in the language being learned. Put the meaning in the learner's meaning language. Say where each field came from: "lesson" when it is in the material, "ai" when you wrote it. If a field is missing, leave it out rather than guessing; the learner can fill it in later.

A term already in the learner's decks is skipped, never rejected, and the result names the existing card. Re-sending the same batch is safe.

A card may have one picture, set with set_card_image from a public link or base64 bytes. Give it a description of what the picture shows that never names the term or meaning: it is what a screen reader says and what review shows if the picture cannot load. Picture review modes (cue "image") are set on each card with update_card or add_cards, never on a deck, and ask only while the card has a described picture. A road sign would be reviewModes [{ "cue": "image", "target": "meaning" }]; until it has a described picture, a card of picture modes only is asked in the text mode with the same target instead.

A series is an optional, ordered group of the learner's own decks that they review together. Put a deck in one with update_deck and seriesId, or set a series' whole deck list with update_series. Decks the learner joined from someone else never belong to their series.

A section is an optional, ordered part of one deck, such as one lesson. Every learner of the deck sees its sections; only the owner changes them. Create one with create_section, and move many cards at once with move_cards_to_section or give a card its section in add_cards and update_card. To turn lessons into sections, list the deck's cards with get_deck, group them by source, create a section per lesson in lesson order, and move each group in. While the deck opens sections in order (sectionsInOrder, on by default), each learner reviews the first section, and the next becomes ready once every card of the current one has come up and 80% are Known. The learner starts sections in the app; a card they already started always stays in review.

Archive is the only removal, and restore undoes it. Nothing is deleted.`;

/**
 * A fresh server per request. Stateless: tools read and write through the same service
 * layer the REST routes use, with actor "mcp", so nothing can bypass product rules and
 * every write lands in Activity.
 */
export function buildMcpServer(principal: McpPrincipal): McpServer {
  const server = new McpServer({ name: "lymi", version: "0.2.0" }, { instructions: INSTRUCTIONS });
  const { ctx } = principal;
  const run = (tool: string, fn: () => Promise<CallToolResult>) => runTool(tool, fn, principal);

  server.registerTool(
    "list_decks",
    {
      title: "List decks",
      description:
        "Every active deck with its card count and how many cards are due now, plus the language meanings are written in. Call this first: card adds need a deck id.",
      inputSchema: z.object({}),
      outputSchema: DecksOut,
      ...readTool,
    },
    () =>
      run("list_decks", async () => {
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
      ...readTool,
    },
    ({ deckId }) =>
      run("get_deck", async () => {
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
      ...readTool,
    },
    (search) =>
      run("search_cards", async () => {
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
      description: "One card by id, with everything the learner wrote on it.",
      inputSchema: z.object({ cardId: z.string().min(1) }),
      outputSchema: CardOut,
      ...readTool,
    },
    ({ cardId }) => run("get_card", async () => result(cardOut(await showCard(ctx, cardId)))),
  );

  server.registerTool(
    "due_counts",
    {
      title: "Due counts",
      description: `How many cards are waiting to be reviewed right now, in total, per deck and per series, and how many are in each Today round: forgotten today, new, and slipping (forgotten at least ${SLIPPING_LAPSES} times in at least ${SLIPPING_REVIEWS} reviews). Only the learner can review them, in the app.`,
      inputSchema: z.object({}),
      outputSchema: DueOut,
      ...readTool,
    },
    () =>
      run("due_counts", async () => {
        const [decks, series, rounds] = await Promise.all([
          listDecks(ctx),
          listSeries(ctx),
          reviewRounds(ctx),
        ]);
        return result({
          dueNow: decks.reduce((sum, d) => sum + d.due, 0),
          total: decks.reduce((sum, d) => sum + d.total, 0),
          decks: decks.map((d) => ({ id: d.id, name: d.name, due: d.due, total: d.total })),
          series: series.map((s) => ({ id: s.id, name: s.name, due: s.due, total: s.total })),
          rounds,
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
      ...writeTool({ idempotent: true }),
    },
    ({ cards }) =>
      run("add_cards", async () => {
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
      ...writeTool({ idempotent: false, overwrites: true }),
    },
    ({ cardId, ...patch }) =>
      run("update_card", async () => {
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
      ...writeTool({ idempotent: false }),
    },
    ({ cardId }) =>
      run("archive_card", async () => {
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
      ...writeTool({ idempotent: false }),
    },
    ({ cardId }) =>
      run("restore_card", async () => {
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
      ...writeTool({ idempotent: false }),
    },
    (input) =>
      run("create_deck", async () => {
        denyReads(principal);
        return result(deckOut(await createDeck(ctx, input)));
      }),
  );

  server.registerTool(
    "update_deck",
    {
      title: "Edit a deck",
      description:
        "Rename a deck, change its description, default language or review modes, or move it into or out of a series with seriesId. Send only what changes. Needs write.",
      inputSchema: z.object({ deckId: z.string().min(1) }).extend(DeckInput.partial().shape),
      outputSchema: DeckOut,
      ...writeTool({ idempotent: false, overwrites: true }),
    },
    ({ deckId, ...patch }) =>
      run("update_deck", async () => {
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
      ...writeTool({ idempotent: false }),
    },
    ({ deckId }) =>
      run("archive_deck", async () => {
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
      ...writeTool({ idempotent: false }),
    },
    ({ deckId }) =>
      run("restore_deck", async () => {
        denyReads(principal);
        await restoreDeck(ctx, deckId);
        return result({ ok: true });
      }),
  );

  server.registerTool(
    "list_series",
    {
      title: "List series",
      description:
        "The learner's series in order, each with its decks in order and their card and due counts. Set archived to true for archived series, for example to find one to restore.",
      inputSchema: z.object({
        archived: z.boolean().optional().describe("Archived series instead of active ones"),
      }),
      outputSchema: SeriesListOut,
      ...readTool,
    },
    ({ archived }) =>
      run("list_series", async () =>
        result({ series: (await listSeries(ctx, { archived })).map(seriesOut) }),
      ),
  );

  server.registerTool(
    "create_series",
    {
      title: "Create a series",
      description:
        "Make a series, last in the learner's order, and optionally move their decks into it in the order given. Check list_series first: one may exist. Needs write.",
      inputSchema: SeriesInput,
      outputSchema: SeriesItemOut,
      ...writeTool({ idempotent: false }),
    },
    (input) =>
      run("create_series", async () => {
        denyReads(principal);
        return result(seriesOut(await createSeries(ctx, input)));
      }),
  );

  server.registerTool(
    "update_series",
    {
      title: "Edit a series",
      description:
        "Rename a series, or set every deck it holds in order. A deck listed from elsewhere moves in; one left out goes back to the learner's other decks. Sending the same list again changes nothing. Needs write.",
      inputSchema: z.object({
        seriesId: z.string().min(1),
        name: SeriesInput.shape.name.optional(),
        deckIds: z
          .array(z.string().min(1))
          .max(200)
          .optional()
          .describe("Every deck the series should hold, in order"),
      }),
      outputSchema: SeriesItemOut,
      ...writeTool({ idempotent: true, overwrites: true }),
    },
    ({ seriesId, name, deckIds }) =>
      run("update_series", async () => {
        denyReads(principal);
        if (name === undefined && deckIds === undefined) {
          throw new ServiceError("invalid", "Send a name, deckIds, or both.");
        }
        // Decks first: they are the part that can be refused, so a refusal never leaves a rename behind.
        if (deckIds) await setSeriesDecks(ctx, seriesId, { deckIds });
        const updated =
          name !== undefined
            ? await renameSeries(ctx, seriesId, name)
            : await getSeries(ctx, seriesId);
        return result(seriesOut(updated));
      }),
  );

  server.registerTool(
    "reorder_series",
    {
      title: "Reorder series",
      description:
        "Put the learner's active series in a new order. List every one of them once; a list that no longer matches fails, so call list_series again. Needs write.",
      inputSchema: SeriesOrderInput,
      outputSchema: SeriesListOut,
      ...writeTool({ idempotent: true }),
    },
    (input) =>
      run("reorder_series", async () => {
        denyReads(principal);
        return result({ series: (await reorderSeries(ctx, input)).map(seriesOut) });
      }),
  );

  server.registerTool(
    "archive_series",
    {
      title: "Archive a series",
      description:
        'Hide a series. With decks "archive" its decks leave Library and review with it; with "keep" they stay, without a series. Ask the learner which they want. restore_series undoes either. Needs write.',
      inputSchema: z.object({ seriesId: z.string().min(1) }).extend(SeriesArchiveInput.shape),
      outputSchema: OkOut,
      ...writeTool({ idempotent: true }),
    },
    ({ seriesId, decks }) =>
      run("archive_series", async () => {
        denyReads(principal);
        await archiveSeries(ctx, seriesId, { decks });
        return result({ ok: true });
      }),
  );

  server.registerTool(
    "restore_series",
    {
      title: "Restore a series",
      description:
        "Bring an archived series back, with the decks archived alongside it. Find archived series with list_series and archived set to true. Needs write.",
      inputSchema: z.object({ seriesId: z.string().min(1) }),
      outputSchema: OkOut,
      ...writeTool({ idempotent: true }),
    },
    ({ seriesId }) =>
      run("restore_series", async () => {
        denyReads(principal);
        await restoreSeries(ctx, seriesId);
        return result({ ok: true });
      }),
  );

  server.registerTool(
    "list_sections",
    {
      title: "List a deck's sections",
      description:
        "A deck's sections in order, each with its card count and the learner's standing: open, ready or locked, with Known and not-started counts. progress names the section the learner is on and the next one. Set archived to true for archived sections.",
      inputSchema: z.object({
        deckId: z.string().min(1),
        archived: z.boolean().optional().describe("Archived sections instead of active ones"),
      }),
      outputSchema: SectionListOut,
      ...readTool,
    },
    ({ deckId, archived }) =>
      run("list_sections", async () => sectionsResult(await listSections(ctx, deckId, { archived }))),
  );

  server.registerTool(
    "create_section",
    {
      title: "Create a section",
      description:
        "Make a section, last in the deck, and optionally move cards of the deck into it. Check list_sections first: it may exist. Only the deck's owner can. Needs write.",
      inputSchema: z.object({ deckId: z.string().min(1) }).extend(SectionInput.shape),
      outputSchema: SectionItemOut,
      ...writeTool({ idempotent: false }),
    },
    ({ deckId, ...input }) =>
      run("create_section", async () => {
        denyReads(principal);
        return result(sectionOut(await createSection(ctx, deckId, input)));
      }),
  );

  server.registerTool(
    "rename_section",
    {
      title: "Rename a section",
      description: "Give a section a new name. Needs write.",
      inputSchema: z.object({ sectionId: z.string().min(1), name: SectionInput.shape.name }),
      outputSchema: SectionItemOut,
      ...writeTool({ idempotent: true, overwrites: true }),
    },
    ({ sectionId, name }) =>
      run("rename_section", async () => {
        denyReads(principal);
        return result(sectionOut(await renameSection(ctx, sectionId, name)));
      }),
  );

  server.registerTool(
    "reorder_sections",
    {
      title: "Reorder a deck's sections",
      description:
        "Put a deck's active sections in a new order. List every one once; a list that no longer matches fails, so call list_sections again. Reordering never locks a section a learner opened. Needs write.",
      inputSchema: z.object({ deckId: z.string().min(1) }).extend(SectionOrderInput.shape),
      outputSchema: SectionListOut,
      ...writeTool({ idempotent: true }),
    },
    ({ deckId, sectionIds }) =>
      run("reorder_sections", async () => {
        denyReads(principal);
        return sectionsResult(await reorderSections(ctx, deckId, { sectionIds }));
      }),
  );

  server.registerTool(
    "move_cards_to_section",
    {
      title: "Move cards to a section",
      description:
        "Put up to 500 cards of one deck in a section, or take them out of theirs with sectionId null. Schedules and history stay. Sending the same move again changes nothing. Needs write.",
      inputSchema: z.object({
        deckId: z.string().min(1),
        cardIds: z.array(z.string().min(1)).min(1).max(500),
        sectionId: z.string().min(1).nullable().describe("A section of the same deck, or null"),
      }),
      outputSchema: SectionListOut,
      ...writeTool({ idempotent: true }),
    },
    ({ deckId, cardIds, sectionId }) =>
      run("move_cards_to_section", async () => {
        denyReads(principal);
        return sectionsResult(await setCardsSection(ctx, deckId, { cardIds, sectionId }));
      }),
  );

  server.registerTool(
    "archive_section",
    {
      title: "Archive a section",
      description:
        'Hide a section. With cards "archive" its cards leave the deck and review with it; with "keep" they stay in the deck, without a section. Ask the learner which they want. restore_section undoes either. Needs write.',
      inputSchema: z.object({ sectionId: z.string().min(1) }).extend(SectionArchiveInput.shape),
      outputSchema: OkOut,
      ...writeTool({ idempotent: true }),
    },
    ({ sectionId, cards }) =>
      run("archive_section", async () => {
        denyReads(principal);
        await archiveSection(ctx, sectionId, { cards });
        return result({ ok: true });
      }),
  );

  server.registerTool(
    "restore_section",
    {
      title: "Restore a section",
      description:
        "Bring an archived section back with the cards archived alongside it. Find archived sections with list_sections and archived set to true. Needs write.",
      inputSchema: z.object({ sectionId: z.string().min(1) }),
      outputSchema: OkOut,
      ...writeTool({ idempotent: true }),
    },
    ({ sectionId }) =>
      run("restore_section", async () => {
        denyReads(principal);
        await restoreSection(ctx, sectionId);
        return result({ ok: true });
      }),
  );

  server.registerTool(
    "set_card_image",
    {
      title: "Set a card's picture",
      description:
        "Give a card its one picture, replacing any it has. Send a public http or https url, or base64 data. Lymi stores a private, normalized copy and never shows the link. JPEG, PNG, WebP and still GIF up to 10 MB; SVG and animation are refused. Pass the card's imageVersion as version so a newer change is not overwritten. Needs write.",
      inputSchema: z.object({
        cardId: z.string().min(1),
        url: CardImageImportInput.shape.url.optional(),
        data: z
          .base64()
          .max(Math.ceil((IMAGE_LIMITS.maxBytes * 4) / 3) + 4)
          .optional()
          .describe("The picture's bytes, base64. Send this or url, not both."),
        description: ImageDescription.optional().describe(
          "What the picture shows, never naming the term or meaning",
        ),
        version: CardImagePatch.shape.version,
      }),
      outputSchema: CardOut,
      ...writeTool({ idempotent: false, overwrites: true }),
    },
    ({ cardId, url, data, description, version }) =>
      run("set_card_image", async () => {
        denyReads(principal);
        const images = imagesOf(principal);
        if ((url === undefined) === (data === undefined)) {
          throw new ServiceError("invalid", "Send either url or data.");
        }
        const card = url
          ? await importCardImage(ctx, cardId, { url, description, version }, images)
          : await uploadCardImage(
              ctx,
              cardId,
              Uint8Array.from(atob(data as string), (c) => c.charCodeAt(0)),
              { description, version },
              images,
            );
        return result(cardOut(card));
      }),
  );

  server.registerTool(
    "describe_card_image",
    {
      title: "Describe a card's picture",
      description:
        "Change what the card's picture description says. Null removes it, which pauses picture review for the card. Needs write.",
      inputSchema: z.object({ cardId: z.string().min(1) }).extend(CardImagePatch.shape),
      outputSchema: CardOut,
      ...writeTool({ idempotent: false, overwrites: true }),
    },
    ({ cardId, ...patch }) =>
      run("describe_card_image", async () => {
        denyReads(principal);
        return result(cardOut(await describeCardImage(ctx, cardId, patch)));
      }),
  );

  server.registerTool(
    "archive_card_image",
    {
      title: "Archive a card's picture",
      description:
        "Hide the card's picture. Picture review pauses with its schedule intact; restore_card_image brings both back. Needs write.",
      inputSchema: z.object({ cardId: z.string().min(1), version: CardImagePatch.shape.version }),
      outputSchema: CardOut,
      ...writeTool({ idempotent: false }),
    },
    ({ cardId, version }) =>
      run("archive_card_image", async () => {
        denyReads(principal);
        return result(cardOut(await archiveCardImage(ctx, cardId, { version })));
      }),
  );

  server.registerTool(
    "restore_card_image",
    {
      title: "Restore a card's picture",
      description: "Bring back the picture archived last, and picture review with it. Needs write.",
      inputSchema: z.object({ cardId: z.string().min(1), version: CardImagePatch.shape.version }),
      outputSchema: CardOut,
      ...writeTool({ idempotent: false }),
    },
    ({ cardId, version }) =>
      run("restore_card_image", async () => {
        denyReads(principal);
        return result(cardOut(await restoreCardImage(ctx, cardId, { version })));
      }),
  );

  server.registerTool(
    "get_settings",
    {
      title: "Get settings",
      description:
        "The learner's settings: the language meanings are written in, and the daily goal in recall attempts, where every accepted grade counts, Forgot and repeated cards included.",
      inputSchema: z.object({}),
      outputSchema: SettingsOut,
      ...readTool,
    },
    () => run("get_settings", async () => result(settingsOut(await getSettings(ctx)))),
  );

  server.registerTool(
    "update_settings",
    {
      title: "Change settings",
      description:
        "Change the app language, which also sets the language meanings are written in. Cards already written are not translated. Needs write.",
      // The daily goal is the learner's own: a write grant covers cards, not how much they study.
      inputSchema: SettingsPatch.pick({ appLanguage: true }),
      outputSchema: SettingsOut,
      ...writeTool({ idempotent: true }),
    },
    (patch) =>
      run("update_settings", async () => {
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
      ...readTool,
    },
    ({ period, timezone }) =>
      run("get_insights", async () => result(await insights(ctx, { period, zone: timezone }))),
  );

  server.registerTool(
    "get_streak",
    {
      title: "Get the streak",
      description:
        "Today's attempts against the daily goal, days in a row whose goal was satisfied, the longest run, how many days had a review, and every day with an attempt. Days follow the learner's review timezone.",
      inputSchema: z.object({
        timezone: z
          .string()
          .min(1)
          .max(64)
          .optional()
          .describe(
            "IANA timezone such as Europe/Tallinn, used only until the learner's own review timezone is known.",
          ),
      }),
      outputSchema: z.object(StreakOut.shape),
      ...readTool,
    },
    ({ timezone }) => run("get_streak", async () => result(await streak(ctx, { zone: timezone }))),
  );

  withSecuritySchemes(server);
  return server;
}

type ListedTool = { _meta?: { securitySchemes?: unknown } };
type RequestHandler = (request: unknown, ctx: unknown) => Promise<{ tools: ListedTool[] }>;

/**
 * The SDK builds each listed tool from a fixed set of fields and has no hook for the Apps SDK's
 * top-level `securitySchemes`, so the `tools/list` handler is wrapped to copy it out of `_meta`.
 */
function withSecuritySchemes(server: McpServer): void {
  const handlers = (server.server as unknown as { _requestHandlers: Map<string, RequestHandler> })
    ._requestHandlers;
  const list = handlers.get("tools/list");
  if (!list) throw new Error("The MCP SDK no longer registers tools/list where Lymi expects it");
  handlers.set("tools/list", async (request, ctx) => {
    const listed = await list(request, ctx);
    return {
      ...listed,
      tools: listed.tools.map((tool) => ({
        ...tool,
        securitySchemes: tool._meta?.securitySchemes,
      })),
    };
  });
}

/** `_meta.securitySchemes` is the Apps SDK's mirror of the top-level field `withSecuritySchemes` adds. */
const readTool = {
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  _meta: { securitySchemes: [{ type: "oauth2", scopes: ["read"] }] },
};

/**
 * Archive is reversible, so only an edit that replaces text with no way back is destructive.
 * A tool is idempotent only when repeating it adds nothing to Activity.
 */
function writeTool({
  idempotent,
  overwrites = false,
}: {
  idempotent: boolean;
  overwrites?: boolean;
}) {
  return {
    annotations: {
      readOnlyHint: false,
      destructiveHint: overwrites,
      idempotentHint: idempotent,
      openWorldHint: false,
    },
    _meta: { securitySchemes: [{ type: "oauth2", scopes: ["write"] }] },
  };
}

class ReadOnlyConnection extends Error {}

/** The learner may have unticked write on the consent screen. */
function denyReads(principal: McpPrincipal): void {
  if (principal.scope !== "write") throw new ReadOnlyConnection();
}

function imagesOf(principal: McpPrincipal): CardImageStorage {
  if (!principal.images) throw new ServiceError("unavailable", "Pictures are not configured");
  return principal.images;
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

/** A ServiceError speaks to the assistant; any other error may carry SQL and learner data. */
async function runTool(
  tool: string,
  fn: () => Promise<CallToolResult>,
  principal: McpPrincipal,
): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ReadOnlyConnection) return readOnlyFailure(principal);
    if (err instanceof ServiceError) return failure(err.message);
    console.error("MCP tool failed", { tool, error: err instanceof Error ? err.name : typeof err });
    return failure("Lymi could not finish this just now. Try again in a moment.");
  }
}

/** ChatGPT treats `mcp/www_authenticate` on a tool error as a step-up challenge. */
function readOnlyFailure(principal: McpPrincipal): CallToolResult {
  const message =
    "This connection can only read. Ask the learner to reconnect and leave write ticked on the consent screen.";
  const challenge = [
    `resource_metadata="${principal.resourceMetadataUrl}"`,
    `error="insufficient_scope"`,
    `scope="read write offline_access"`,
    `error_description="${message}"`,
  ].join(", ");
  return {
    isError: true,
    content: [{ type: "text", text: message }],
    _meta: { "mcp/www_authenticate": [`Bearer ${challenge}`] },
  };
}

function result(structured: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
    structuredContent: structured,
  };
}

function failure(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

// Output carries the learner's text and the ids a follow-up call needs, not bookkeeping.

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
  sectionId: z.string().nullable().describe("The card's section in its deck"),
  directions: Directions.nullable(),
  reviewModes: z
    .array(ReviewMode)
    .nullable()
    .describe("Overrides the deck's review modes when set"),
  image: z
    .object({
      id: z.string(),
      url: z.string(),
      width: z.number().int(),
      height: z.number().int(),
      description: z.string().nullable(),
      source: z.enum(["upload", "url"]),
    })
    .nullable(),
  imageVersion: z.string().nullable(),
  meaningSource: FieldSource.nullable(),
  exampleSource: FieldSource.nullable(),
  archivedAt: Timestamp.nullable(),
  createdAt: Timestamp,
});
type CardOut = z.infer<typeof CardOut>;

function cardOut(card: CardView): CardOut {
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
    sectionId: card.sectionId,
    directions: card.directions,
    reviewModes: card.reviewModes,
    image: card.image && {
      id: card.image.id,
      url: card.image.url,
      width: card.image.width,
      height: card.image.height,
      description: card.image.description,
      source: card.image.source,
    },
    imageVersion: card.imageVersion,
    meaningSource: card.meaningSource,
    exampleSource: card.exampleSource,
    archivedAt: card.archivedAt ? card.archivedAt.toISOString() : null,
    createdAt: card.createdAt.toISOString(),
  };
}

const DeckOut = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  defaultLanguage: z.string().nullable(),
  directions: Directions,
  reviewModes: z.array(ReviewMode),
  seriesId: z.string().nullable().describe("The learner's series the deck is in"),
  sectionsInOrder: z.boolean().describe("Learners open the deck's sections in order"),
  archivedAt: Timestamp.nullable(),
  createdAt: Timestamp,
});
type DeckOut = z.infer<typeof DeckOut>;

function deckOut(deck: Awaited<ReturnType<typeof getDeck>>): DeckOut {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    defaultLanguage: deck.defaultLanguage,
    directions: deck.directions,
    reviewModes: deck.reviewModes,
    seriesId: deck.seriesId,
    sectionsInOrder: deck.sectionsInOrder,
    archivedAt: deck.archivedAt ? deck.archivedAt.toISOString() : null,
    createdAt: deck.createdAt.toISOString(),
  };
}

const SettingsOut = z.object({
  appLanguage: AppLanguage.nullable().describe(
    "The language of the interface and reminders. Null until the learner has chosen.",
  ),
  meaningLanguage: z
    .string()
    .describe("The language meanings are written in. Follows the app language."),
  dailyGoal: z
    .number()
    .int()
    .describe("Recall attempts that satisfy a day's streak goal. Only the learner changes it."),
});

function settingsOut(settings: Awaited<ReturnType<typeof getSettings>>) {
  return {
    appLanguage: settings.appLanguage,
    meaningLanguage: settings.meaningLanguage,
    dailyGoal: settings.dailyGoal,
  };
}

const DeckSummaryOut = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  defaultLanguage: z.string().nullable(),
  directions: Directions,
  reviewModes: z.array(ReviewMode),
  seriesId: z.string().nullable().describe("The learner's series the deck is in"),
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
    reviewModes: deck.reviewModes,
    seriesId: deck.seriesId,
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
  series: z.array(
    z.object({ id: z.string(), name: z.string(), due: z.number().int(), total: z.number().int() }),
  ),
  rounds: z.object(RoundsOut.shape),
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

const SeriesItemOut = z.object({
  id: z.string(),
  name: z.string(),
  deckIds: z.array(z.string()).describe("Its decks in order. Empty while archived."),
  total: z.number().int(),
  due: z.number().int(),
  archivedDecks: z.number().int().describe("Decks restore_series brings back with it"),
  archivedAt: Timestamp.nullable(),
  createdAt: Timestamp,
});

const SeriesListOut = z.object({ series: z.array(SeriesItemOut) });

const SectionItemOut = z.object({
  id: z.string(),
  deckId: z.string(),
  name: z.string(),
  total: z.number().int(),
  known: z.number().int().describe("Cards the learner knows"),
  notStarted: z.number().int().describe("Cards that have not come up for the learner yet"),
  knownNeeded: z.number().int().describe("Known cards needed before the next section is ready"),
  status: z.enum(["open", "ready", "locked"]).describe("For the learner"),
  archivedCards: z.number().int().describe("Cards restore_section brings back with it"),
  archivedAt: Timestamp.nullable(),
  createdAt: Timestamp,
});

const SectionListOut = z.object({
  sections: z.array(SectionItemOut),
  progress: z
    .object({
      currentId: z.string().nullable(),
      nextId: z.string().nullable(),
      ready: z.boolean(),
    })
    .nullable()
    .describe("Where the learner is. Null when the deck has no sections with cards or does not open them in order."),
});

type SectionList = Awaited<ReturnType<typeof listSections>>;

function sectionOut(section: SectionList["sections"][number]) {
  return {
    id: section.id,
    deckId: section.deckId,
    name: section.name,
    total: section.total,
    known: section.known,
    notStarted: section.notStarted,
    knownNeeded: section.knownNeeded,
    status: section.status,
    archivedCards: section.archivedCards,
    archivedAt: section.archivedAt ? section.archivedAt.toISOString() : null,
    createdAt: section.createdAt.toISOString(),
  };
}

function sectionsResult(list: SectionList) {
  return result({ sections: list.sections.map(sectionOut), progress: list.progress });
}

function seriesOut(series: Awaited<ReturnType<typeof listSeries>>[number]) {
  return {
    id: series.id,
    name: series.name,
    deckIds: series.deckIds,
    total: series.total,
    due: series.due,
    archivedDecks: series.archivedDecks,
    archivedAt: series.archivedAt ? series.archivedAt.toISOString() : null,
    createdAt: series.createdAt.toISOString(),
  };
}
