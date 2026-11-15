import { modeOf, type ReviewModeKey } from "@lymi/core";
import {
  DECK_PAGE_SPREAD,
  deckPageHand,
  deckPageSpread,
  offersDeck,
  type PublicDeckOut,
  type PublicDeckSummary,
  previewMode,
  stableHash,
} from "@lymi/core/catalog";
import { HAND_SIZE } from "./hand";
import { type Locale, locales } from "./routes";

export const SPREAD_SIZE = DECK_PAGE_SPREAD;
export const STACK_SIZE = HAND_SIZE;

export type DeckCard = {
  term: string;
  meaning: string;
  section: string | null;
  /** The language the section is named in, when it is not the deck's meaning language. */
  sectionLanguage?: string | undefined;
  /** The mode this card is shown in here, as a learner is asked it. */
  mode: ReviewModeKey;
  modes: ReviewModeKey[];
  image?: PublicDeckOut["sections"][number]["cards"][number]["image"];
  audio?: PublicDeckOut["sections"][number]["cards"][number]["audio"];
};

export function deckPath(slug: string, locale: Locale): string {
  return locale === "en" ? `/explore/${slug}` : `/${locale}/explore/${slug}`;
}

/**
 * Where a link to the old `/decks/<slug>` address goes now. A deck's address was shared before
 * Explore existed, so it answers a permanent redirect rather than a 404.
 */
export function movedDeckPath(pathname: string): string | null {
  const match = /^(?:\/(uk|ru))?\/decks\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  const locale = (match[1] ?? "en") as Locale;
  return deckPath(match[2] as string, locale);
}

/** The product's add page for a `/add/<slug>` link typed or shared with the wrong domain. */
export function productAddPath(pathname: string): string | null {
  const match = /^\/add\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname);
  return match ? `/add/${match[1]}` : null;
}

/** The deck's own link preview, rendered by the Worker beside the page. */
export function deckSharePath(slug: string, locale: Locale): string {
  return `${deckPath(slug, locale)}/share.png`;
}

/** The deck's page in each locale that offers it; with no deck to ask, every locale. */
export function deckPaths(
  slug: string,
  deck?: { category: string | null; language: string | null },
): Partial<Record<Locale, string>> {
  return Object.fromEntries(
    locales
      .filter((locale) => !deck || offersDeck(locale, deck))
      .map((locale) => [locale, deckPath(slug, locale)]),
  );
}

function sectionsWithMeanings(deck: PublicDeckOut): DeckCard[][] {
  return deck.sections
    .map((section) =>
      section.cards.flatMap((card) =>
        card.meaning
          ? [
              {
                term: card.term,
                meaning: card.meaning,
                section: section.name,
                sectionLanguage: section.nameLanguage,
                mode: previewMode(card),
                modes: card.modes,
                image: card.image,
                audio: card.audio,
              },
            ]
          : [],
      ),
    )
    .filter((cards) => cards.length > 0);
}

export function stackCards(deck: PublicDeckOut, size = STACK_SIZE): DeckCard[] {
  return steppedModes(deckPageHand(deck, sectionsWithMeanings(deck), size));
}

/** Each card in its place's mode, so a deck asked more than one way shows each of them. */
function steppedModes(cards: DeckCard[]): DeckCard[] {
  return cards.map((card, place) => ({ ...card, mode: previewMode(card, place) }));
}

export function spreadCards(deck: PublicDeckOut, size = SPREAD_SIZE): DeckCard[] {
  return steppedModes(deckPageSpread(deck, sectionsWithMeanings(deck), size));
}

export type RecallCue = "term" | "meaning" | "image" | "mixed";

/** What the try-it cards ask from, so the page can say what to recall: one cue, or a mix. */
export function recallCue(cards: readonly DeckCard[]): RecallCue {
  const cues = new Set(cards.map((card) => modeOf(card.mode).cue));
  const [only] = cues;
  return cues.size === 1 && only ? only : "mixed";
}

export interface SectionStep {
  /** 1-based place in the deck's order, or null for cards outside any section. */
  position: number | null;
  name: string | null;
  /** The language the name is in, when it is not the deck's meaning language. */
  nameLanguage?: string | undefined;
  cards: PublicDeckOut["sections"][number]["cards"];
}

/**
 * The deck as the path a learner walks: named sections in order, then any cards outside one.
 * `inOrder` is false for a deck with no sections, whose cards are one open group.
 */
export function sectionPath(deck: PublicDeckOut): { inOrder: boolean; steps: SectionStep[] } {
  let position = 0;
  const steps = deck.sections.map((section) => ({
    position: section.name === null ? null : ++position,
    name: section.name,
    nameLanguage: section.nameLanguage,
    cards: section.cards,
  }));
  return { inOrder: position > 0, steps };
}

/**
 * A language tag's name in the page's language. Ukrainian and Russian write it lower-case inside
 * a sentence, so `label` capitalises it only where it starts a label on its own.
 */
export function languageName(
  tag: string | null,
  locale: string,
  { label = false }: { label?: boolean } = {},
): string | null {
  if (!tag) return null;
  let name: string;
  try {
    name = new Intl.DisplayNames([locale], { type: "language" }).of(tag) ?? tag;
  } catch {
    return tag;
  }
  return label ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) : name;
}

/**
 * Everything the page renders, folded into one value: the deck, More like this and its other links.
 * The publish revision moves only on publish and withdrawal, so a corrected meaning, a new card or
 * another deck's new tag would otherwise keep the old validator.
 */
export function deckContentHash(
  deck: PublicDeckOut,
  related: readonly PublicDeckSummary[] = [],
  /** The page's other links to decks and shelves, which a new deck elsewhere can change. */
  links?: unknown,
): string {
  const shown = links === undefined ? { deck, related } : { deck, related, links };
  return stableHash(JSON.stringify(shown)).toString(36);
}

/**
 * Changes whenever what the page shows changes: the deck's own content, the locale it is read in,
 * and the Worker that rendered it. It never depends on who is asking.
 */
export function deckEtag(parts: {
  slug: string;
  content: string;
  locale: Locale;
  version: string | undefined;
}): string {
  return `W/"deck-${parts.slug}-${parts.content}-${parts.locale}-${parts.version ?? "dev"}"`;
}

export function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  const bare = (tag: string) => tag.trim().replace(/^W\//, "");
  return ifNoneMatch.split(",").some((tag) => tag.trim() === "*" || bare(tag) === bare(etag));
}

const CRAWLER =
  /bot|crawl|spider|slurp|scrape|preview|facebookexternalhit|whatsapp|embedly|headless|lighthouse|curl|wget|python|go-http|java\/|okhttp|axios|node-fetch|undici|http-client/i;

/**
 * Whether a request reads as a person opening the page: a GET that is not a prefetch and does not
 * name itself as a crawler, link previewer or script. User agents can lie, so this filters, never proves.
 */
export function countsAsPageView(request: Request): boolean {
  if (request.method !== "GET") return false;
  const purpose = request.headers.get("sec-purpose") ?? request.headers.get("purpose") ?? "";
  if (/prefetch|prerender/i.test(purpose)) return false;
  const agent = request.headers.get("user-agent") ?? "";
  return agent !== "" && !CRAWLER.test(agent);
}

/** Short and public: a publisher's correction reaches visitors within minutes. */
export const DECK_CACHE_CONTROL = "public, max-age=300";
export const MISSING_CACHE_CONTROL = "public, max-age=60";

/** JSON for a `<script>` element: `<` is escaped so a card cannot close the element. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
