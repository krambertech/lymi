import type { I18n } from "@lingui/core";
import { type PublicDeckOut, type PublicDeckSummary, taughtLanguage } from "@lymi/core/catalog";
import type { Question } from "../components/landing/faq";
import { SOURCE_CODE_URL } from "../components/landing/site-links";
import { deckPath, languageName } from "./deck-page";
import { explorePath } from "./explore";
import type { Locale } from "./routes";
import { deckSubjectInEnglish } from "./subjects";

const SITE = "https://lymi.app";

/**
 * What a published deck teaches, for schema.org: a language's vocabulary, or else its subject, both
 * named in English. A deck that teaches no language is never called a vocabulary list.
 */
export function deckTeaches(deck: Pick<PublicDeckOut, "category" | "language">) {
  const language = languageName(taughtLanguage(deck), "en");
  if (language) {
    return {
      learningResourceType: "Vocabulary list",
      teaches: `${language} vocabulary`,
      about: { "@type": "Language", name: language, alternateName: deck.language },
    };
  }
  const subject = deckSubjectInEnglish(deck);
  return {
    learningResourceType: "Flashcards",
    ...(subject && { teaches: subject, about: { "@type": "Thing", name: subject } }),
  };
}

/** schema.org LearningResource: the deck, and the language or subject it teaches. */
export function deckStructuredData(deck: PublicDeckOut, locale: Locale) {
  const url = new URL(deckPath(deck.slug, locale), SITE).toString();
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": url,
    url,
    name: deck.name,
    description: deck.summary,
    inLanguage: [...new Set([deck.language, deck.meaningLanguage].filter(Boolean))],
    ...deckTeaches(deck),
    publisher: { "@type": "Organization", name: deck.publisher },
    datePublished: deck.publishedAt,
    ...(deck.sources.length > 0 && {
      citation: deck.sources.map((source) => ({
        "@type": "CreativeWork",
        name: source.title,
        ...(source.url && { url: source.url }),
      })),
    }),
    isPartOf: { "@type": "WebSite", name: "Lymi", url: `${SITE}/` },
  };
}

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
  page: { name: string; description: string; path?: string },
) {
  const url = new URL(page.path ?? explorePath(locale), SITE).toString();
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
      itemListElement: decks.map((deck, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "LearningResource",
          "@id": new URL(deckPath(deck.slug, locale), SITE).toString(),
          url: new URL(deckPath(deck.slug, locale), SITE).toString(),
          name: deck.name,
          description: deck.summary,
          inLanguage: [...new Set([deck.language, deck.meaningLanguage].filter(Boolean))],
          ...deckTeaches(deck),
        },
      })),
    },
  };
}

/** schema.org FAQPage from the questions the page renders; the answers are the visible copy. */
export function faqPage(
  questions: readonly Question[],
  i18n: I18n,
  page: { name: string; path: string },
) {
  const url = new URL(page.path, SITE).toString();
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    url,
    name: page.name,
    inLanguage: i18n.locale,
    mainEntity: questions.map((question) => ({
      "@type": "Question",
      name: i18n._(question.question),
      acceptedAnswer: { "@type": "Answer", text: i18n._(question.answer) },
    })),
  };
}

/** The product itself, named the same way on every page that describes it. */
export function softwareApplication(page: { description: string; path: string; locale: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE}/#app`,
    name: "Lymi",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description: page.description,
    url: new URL(page.path, SITE).toString(),
    inLanguage: page.locale,
    isAccessibleForFree: true,
    license: "https://www.gnu.org/licenses/agpl-3.0.html",
    sameAs: [SOURCE_CODE_URL],
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

/** The entity behind the product, so a search engine can tie Lymi to its source and its site. */
export function organizationAndSite(locale: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Lymi",
      url: `${SITE}/`,
      logo: `${SITE}/icon.svg`,
      email: "hello@lymi.app",
      sameAs: [SOURCE_CODE_URL],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      name: "Lymi",
      url: `${SITE}/`,
      inLanguage: locale,
      publisher: { "@id": `${SITE}/#organization` },
    },
  ];
}

/**
 * Everything one marketing page declares, in the order a reader of the source would expect:
 * the product, then the questions it answers.
 */
export function marketingPage(page: {
  name: string;
  description: string;
  path: string;
  i18n: I18n;
  questions?: readonly Question[] | undefined;
  entity?: boolean | undefined;
}) {
  const locale = page.i18n.locale;
  return [
    ...(page.entity ? organizationAndSite(locale) : []),
    softwareApplication({ description: page.description, path: page.path, locale }),
    ...(page.questions?.length
      ? [faqPage(page.questions, page.i18n, { name: page.name, path: page.path })]
      : []),
  ];
}

/** Explore, then the shelf, for a shelf's own page. */
export function shelfBreadcrumbs(
  locale: Locale,
  explore: string,
  shelf: { name: string; path: string },
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: explore,
        item: new URL(explorePath(locale), SITE).toString(),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: shelf.name,
        item: new URL(shelf.path, SITE).toString(),
      },
    ],
  };
}
