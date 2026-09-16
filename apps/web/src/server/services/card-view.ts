import { normaliseTerm, type ReviewMode } from "@lymi/core";
import { and, eq, inArray, isNull } from "@lymi/core/db";
import type { Card, CardImage, CardLocalization } from "@lymi/core/schema";
import { type Db, schema } from "../db";
import { selectIn } from "./batch";
import { pinnedEditions } from "./editions";
import { cardModes } from "./modes";

/** A picture as callers see it, without the storage key or source URL. */
export interface CardImageView {
  id: string;
  url: string;
  contentType: string;
  width: number;
  height: number;
  byteSize: number;
  description: string | null;
  source: CardImage["sourceKind"];
  sourceHost: string | null;
  createdBy: CardImage["createdBy"];
  createdAt: Date;
  updatedAt: Date;
}

/** A card as the API, MCP and app see it: its own review modes as objects, and its active picture. */
export type CardView = Omit<Card, "reviewModeKeys" | "revision"> & {
  reviewModes: ReviewMode[] | null;
  image: CardImageView | null;
};

export function imageView(image: CardImage): CardImageView {
  return {
    id: image.id,
    url: `/api/cards/${image.cardId}/image/${image.id}`,
    contentType: image.contentType,
    width: image.width,
    height: image.height,
    byteSize: image.byteSize,
    description: image.description,
    source: image.sourceKind,
    sourceHost: image.sourceHost,
    createdBy: image.createdBy,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  };
}

function view(card: Card, image: CardImage | undefined): CardView {
  const { reviewModeKeys, revision, ...rest } = card;
  return {
    ...rest,
    reviewModes: cardModes({ directions: card.directions, reviewModeKeys }),
    image: image ? imageView(image) : null,
  };
}

/**
 * The text a pinned edition replaces on a card. The card's language, tags, picture, audio and
 * review modes are canonical and shared by every edition. ADR 0015.
 */
const EDITION_TEXT = ["term", "meaning", "pronunciation", "example", "notes"] as const;

/**
 * Approved text for these cards in the editions the viewer pinned. Nothing runs for a learner
 * who pinned none, which is every owner and every member of an ordinary shared deck.
 */
export async function editionText(db: Db, viewerId: string, cards: readonly Card[]) {
  const pinned = await pinnedEditions(
    db,
    viewerId,
    cards.map((card) => card.deckId),
  );
  if (pinned.size === 0) return new Map<string, CardLocalization>();
  const wanted = cards.filter((card) => pinned.has(card.deckId)).map((card) => card.id);
  const languages = [...new Set(pinned.values())];
  const rows = await selectIn(wanted, (slice) =>
    db
      .select()
      .from(schema.cardLocalizations)
      .where(
        and(
          inArray(schema.cardLocalizations.cardId, slice),
          inArray(schema.cardLocalizations.language, languages),
          eq(schema.cardLocalizations.status, "approved"),
        ),
      ),
  );
  const byCard = new Map(cards.map((card) => [card.id, card.deckId]));
  return new Map(
    rows.flatMap((row) => {
      const deckId = byCard.get(row.cardId);
      return deckId && pinned.get(deckId) === row.language ? [[row.cardId, row]] : [];
    }),
  );
}

/**
 * Present many cards with one image lookup per 90 cards, keeping their order. `viewerId` is
 * required rather than optional: leaving it out would quietly read past a learner's pinned
 * edition and show them the deck's own words.
 */
export async function presentCards(
  db: Db,
  cards: readonly Card[],
  viewerId: string,
): Promise<CardView[]> {
  const ids = [...new Set(cards.map((card) => card.id))];
  const images = new Map<string, CardImage>();
  for (let i = 0; i < ids.length; i += 90) {
    const rows = await db
      .select()
      .from(schema.cardImages)
      .where(
        and(
          inArray(schema.cardImages.cardId, ids.slice(i, i + 90)),
          eq(schema.cardImages.status, "active"),
        ),
      );
    for (const row of rows) images.set(row.cardId, row);
  }
  const sectionIds = [
    ...new Set(cards.flatMap((card) => (card.sectionId ? [card.sectionId] : []))),
  ];
  const activeSections = new Set(
    (
      await selectIn(sectionIds, (slice) =>
        db
          .select({ id: schema.sections.id })
          .from(schema.sections)
          .where(and(inArray(schema.sections.id, slice), isNull(schema.sections.archivedAt))),
      )
    ).map((row) => row.id),
  );
  const editions = await editionText(db, viewerId, cards);
  // A card in an archived section reads as having none, as a deck in an archived series does.
  return cards.map((card) =>
    view(
      inEdition(
        card.sectionId && !activeSections.has(card.sectionId) ? { ...card, sectionId: null } : card,
        editions.get(card.id),
      ),
      images.get(card.id),
    ),
  );
}

/**
 * A field the edition left empty keeps the card's own text, so a partial edition still reads.
 * A localized term carries its own folded key, so search matches the words the learner sees
 * rather than the deck's own. Nothing here is written back: the stored card is unchanged.
 */
export function inEdition(card: Card, text: CardLocalization | undefined): Card {
  if (!text) return card;
  const replaced = Object.fromEntries(
    EDITION_TEXT.flatMap((field) => (text[field] ? [[field, text[field]]] : [])),
  );
  return {
    ...card,
    ...replaced,
    ...(text.term ? { normalizedTerm: normaliseTerm(text.term) } : {}),
  };
}

export async function presentCard(db: Db, card: Card, viewerId: string): Promise<CardView> {
  const [presented] = await presentCards(db, [card], viewerId);
  return presented as CardView;
}
