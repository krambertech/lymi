import type { Card } from "@lymi/client/api";

// A screen that holds its own copy of a card, such as a review, hears when Edit card saved it.
const listeners = new Set<(card: Card) => void>();

export function cardEdited(card: Card) {
  for (const listener of listeners) listener(card);
}

export function onCardEdited(listener: (card: Card) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The card a review opened Edit card on, for a deck whose list is not on the phone, such as offline.
let held: Card | null = null;

export function holdCard(card: Card) {
  held = card;
}

export function heldCard(id: string): Card | null {
  return held?.id === id ? held : null;
}
