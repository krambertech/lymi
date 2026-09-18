import { type PublicDeckSummary, trayHue } from "@lymi/core/catalog";

export { TRAY_HUES, trayHue } from "@lymi/core/catalog";

/**
 * The hues down one shelf. Each is the deck's own and nothing else: stepping a repeat along
 * would make the colour depend on which decks are beside it, so a search that hid a neighbour
 * would repaint the rest, and a deck's own page — which knows no shelf — could not agree with
 * Explore. Two of the eight landing together is the price of a colour that never moves.
 */
export function trayHues(decks: readonly PublicDeckSummary[]): number[] {
  return decks.map((deck) => trayHue(deck.slug));
}
