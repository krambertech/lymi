import type { I18n } from "@lingui/core";
import { type PublicDeckOut, type PublicDeckSummary, taughtLanguage } from "@lymi/core/catalog";
import type { Question } from "../components/landing/faq";
import { LANDING_BLURB } from "../components/landing/landing-copy";
import { changelogUpdatePath } from "./changelog-paths";
import { deckPath, languageName } from "./deck-page";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "./downloads";
import { explorePath } from "./explore";
import { type Locale, localizedPath, locales } from "./routes";
import { deckSubjectInEnglish } from "./subjects";

const SITE = "https://lymi.app";
const APP_ID = `${SITE}/#app`;
const PUBLISHER = {
  "@type": "Organization",
  "@id": `${SITE}/#organization`,
  name: "Lymi",
  url: `${SITE}/`,
};
const WEBSITE = { "@type": "WebSite", "@id": `${SITE}/#website`, name: "Lymi", url: `${SITE}/` };

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
    isPartOf: WEBSITE,
  };
}

function breadcrumbs(crumbs: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map(({ name, path }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: new URL(path, SITE).toString(),
    })),
  };
}

/** Explore, the deck's shelf where it has a page, then the deck. */
export function deckBreadcrumbs(
  deck: Pick<PublicDeckSummary, "slug" | "name">,
  locale: Locale,
  exploreName: string,
  shelf?: { name: string; path: string } | null,
) {
  return breadcrumbs([
    { name: exploreName, path: explorePath(locale) },
    ...(shelf ? [shelf] : []),
    { name: deck.name, path: deckPath(deck.slug, locale) },
  ]);
}

export function examBreadcrumbs(locale: Locale, hub: string, exam: { name: string; path: string }) {
  return breadcrumbs([{ name: hub, path: localizedPath("exams", locale) }, exam]);
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
    isPartOf: WEBSITE,
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

/** The product itself: one entity with one address, whatever page it is declared on. */
export function softwareApplication(i18n: I18n) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: "Lymi",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, iOS, Android, macOS",
    description: i18n._(LANDING_BLURB),
    url: `${SITE}/`,
    sameAs: [APP_STORE_URL, GOOGLE_PLAY_URL],
    inLanguage: locales,
    publisher: PUBLISHER,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export function webPage(page: { name: string; description: string; path: string; locale: string }) {
  const url = new URL(page.path, SITE).toString();
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    url,
    name: page.name,
    description: page.description,
    inLanguage: page.locale,
    about: { "@id": APP_ID },
    isPartOf: WEBSITE,
  };
}

export function changelogPost(
  update: { slug: string; title: string; summary: string; date: Date },
  locale: Locale,
) {
  const url = new URL(changelogUpdatePath(update.slug, locale), SITE).toString();
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": url,
    url,
    headline: update.title,
    description: update.summary,
    datePublished: update.date.toISOString(),
    inLanguage: locale,
    about: { "@type": "SoftwareApplication", "@id": APP_ID, name: "Lymi" },
    author: PUBLISHER,
    publisher: PUBLISHER,
    isPartOf: WEBSITE,
  };
}

/** The entity behind the product, so a search engine can tie Lymi to its site. */
export function organizationAndSite(locale: string) {
  return [
    {
      "@context": "https://schema.org",
      ...PUBLISHER,
      legalName: "Krambertech OÜ",
      logo: `${SITE}/icon.svg`,
      email: "hello@lymi.app",
    },
    {
      "@context": "https://schema.org",
      ...WEBSITE,
      inLanguage: locale,
      publisher: PUBLISHER,
    },
  ];
}

/**
 * Everything one marketing page declares, in the order a reader of the source would expect:
 * the product, the page about it, then the questions it answers.
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
    softwareApplication(page.i18n),
    webPage({ name: page.name, description: page.description, path: page.path, locale }),
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
  return breadcrumbs([{ name: explore, path: explorePath(locale) }, shelf]);
}
