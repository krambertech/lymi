import type { HandCard } from "../components/landing/hand-cards";
import type { DeckCard } from "./deck-page";
import { publicMediaUrl } from "./origins";

/**
 * A deck page's cards as the landing hand deals them. The section names the card, in the
 * original's language when an edition has no approved name for it.
 */
export function deckHandCards(cards: DeckCard[], termLanguage: string | null): HandCard[] {
  return cards.map((card, index) => ({
    id: `deck-${index}`,
    source: card.section ?? "",
    sourceLanguage: card.sectionLanguage,
    language: termLanguage ?? undefined,
    term: card.term,
    meaning: card.meaning,
    mode: card.mode,
    audio: card.audio ? publicMediaUrl(card.audio.cardId, "audio") : null,
    image: card.image
      ? {
          url: publicMediaUrl(card.image.cardId, "image"),
          description: card.image.description,
          width: card.image.width,
          height: card.image.height,
        }
      : null,
  }));
}
