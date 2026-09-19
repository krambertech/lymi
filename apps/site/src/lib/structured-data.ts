import type { PublicDeckSummary } from "@lymi/core/catalog";
import { deckPath, languageName } from "./deck-page";
import { explorePath } from "./explore";
import type { Locale } from "./routes";

const SITE = "https://lymi.app";

const CEFR = "https://www.coe.int/en/web/common-european-framework-reference-languages";

/** schema.org BreadcrumbList: Explore, then the deck, so a result shows where the page sits. */
export function deckBreadcrumbs(
  deck: Pick<PublicDeckSummary, "slug" | "name">,
  locale: Locale,
  exploreName: string,
) {
  const crumb = (position: number, name: string, path: string) => ({
    "@type": "ListItem",
    position,
    name,
    item: new URL(path, SITE).toString(),
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      crumb(1, exploreName, explorePath(locale)),
      crumb(2, deck.name, deckPath(deck.slug, locale)),
    ],
  };
}

/**
 * schema.org CollectionPage holding an ItemList of the decks, each the LearningResource its own
 * page describes in full, so a search engine can pair the catalogue with the pages it lists.
 */
export function exploreStructuredData(
  decks: readonly PublicDeckSummary[],
  locale: Locale,
  page: { name: string; description: string },
) {
  const url = new URL(explorePath(locale), SITE).toString();
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    url,
    name: page.name,
    description: page.description,
    inLanguage: locale,
    isPartOf: { "@type": "WebSite", name: "Lymi", url: `${SITE}/` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: decks.length,
      itemListElement: decks.map((deck, index) => {
        const language = languageName(deck.language, "en");
        return {
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "LearningResource",
            "@id": new URL(deckPath(deck.slug, locale), SITE).toString(),
            url: new URL(deckPath(deck.slug, locale), SITE).toString(),
            name: deck.name,
            description: deck.summary,
            learningResourceType: "Vocabulary list",
            inLanguage: [...new Set([deck.language, deck.meaningLanguage].filter(Boolean))],
            ...(language && { teaches: `${language} vocabulary` }),
            ...(deck.level && {
              educationalLevel: {
                "@type": "DefinedTerm",
                name: deck.level,
                termCode: deck.level,
                inDefinedTermSet: CEFR,
              },
            }),
          },
        };
      }),
    },
  };
}
