import {
  hasShelfPage,
  type PublicDeckSummary,
  shelfRoute,
  shelvesOf,
  trayHue,
} from "@lymi/core/catalog";
import { shelfPath } from "./explore";

/** A shelf with its own page, as the Explore menu lists it; the client names it in its language. */
export interface MenuShelf {
  key: string;
  language: string | null;
  path: string;
  decks: number;
  hue: number;
}

export interface MenuShelves {
  languages: MenuShelf[];
  subjects: MenuShelf[];
}

/** The Explore menu shows this many language shelves, the biggest first. */
export const MENU_LANGUAGE_SHELVES = 8;

/** The shelves that have a page in this locale's catalogue: the biggest languages, then every subject. */
export function menuShelves(decks: readonly PublicDeckSummary[], locale: string): MenuShelves {
  const shelves = shelvesOf(decks).flatMap((shelf) => {
    const route = shelfRoute(shelf);
    if (!route || !hasShelfPage(shelf)) return [];
    return [
      {
        key: shelf.key,
        language: shelf.language,
        path: shelfPath(route, locale),
        decks: shelf.decks.length,
        hue: trayHue(route.name),
      },
    ];
  });
  return {
    languages: shelves.filter((shelf) => shelf.language).slice(0, MENU_LANGUAGE_SHELVES),
    subjects: shelves.filter((shelf) => !shelf.language),
  };
}
