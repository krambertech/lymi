import type { PublicDeckSummary } from "@lymi/core/catalog";

/**
 * Eight hues, set in `styles.css` as `.deck-tray[data-hue]`. A deck's own is a pure function of
 * its slug, so Explore and the deck page arrive at the same colour without storing one, and it
 * does not move as the catalogue grows around it.
 */
export const TRAY_HUES = 8;

/** FNV-1a of the slug. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function trayHue(slug: string): number {
  return hash(slug) % TRAY_HUES;
}

/**
 * The hues down one shelf. Each is the deck's own and nothing else: stepping a repeat along
 * would make the colour depend on which decks are beside it, so a search that hid a neighbour
 * would repaint the rest, and a deck's own page — which knows no shelf — could not agree with
 * Explore. Two of the eight landing together is the price of a colour that never moves.
 */
export function trayHues(decks: readonly PublicDeckSummary[]): number[] {
  return decks.map((deck) => trayHue(deck.slug));
}
