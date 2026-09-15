import type { ReviewMode } from "@lymi/core";
import { and, eq, inArray, isNull } from "@lymi/core/db";
import type { Card, CardImage } from "@lymi/core/schema";
import { type Db, schema } from "../db";
import { selectIn } from "./batch";
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
export type CardView = Omit<Card, "reviewModeKeys"> & {
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
  const { reviewModeKeys, ...rest } = card;
  return {
    ...rest,
    reviewModes: cardModes({ directions: card.directions, reviewModeKeys }),
    image: image ? imageView(image) : null,
  };
}

/** Present many cards with one image lookup per 90 cards, keeping their order. */
export async function presentCards(db: Db, cards: readonly Card[]): Promise<CardView[]> {
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
  // A card in an archived section reads as having none, as a deck in an archived series does.
  return cards.map((card) =>
    view(
      card.sectionId && !activeSections.has(card.sectionId) ? { ...card, sectionId: null } : card,
      images.get(card.id),
    ),
  );
}

export async function presentCard(db: Db, card: Card): Promise<CardView> {
  const [presented] = await presentCards(db, [card]);
  return presented as CardView;
}
