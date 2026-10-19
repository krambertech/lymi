import { I18nProvider } from "@lingui/react";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import {
  type PublicDeckOut,
  type PublicDeckSummary,
  publisherAvatarPath,
  taughtLanguage,
  trayHue,
} from "@lymi/core/catalog";
import { ChevronRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { DeckLinks } from "../../lib/deck-links";
import { type DeckCard, deckPath, languageName, type RecallCue } from "../../lib/deck-page";
import { examOfDeck } from "../../lib/exams";
import { shelfPath } from "../../lib/explore";
import { pageI18n } from "../../lib/i18n";
import { openLymiUrl, productUrl } from "../../lib/origins";
import { type Locale, localizedPath } from "../../lib/routes";
import { deckSubject } from "../../lib/subjects";
import { buttonClass } from "../Button";
import { ExamPageLink } from "../exams/ExamPageLink";
import { DeckTile } from "../explore/DeckTile";
import { shelfLabel, tagLabel } from "../explore/explore-labels";
import { AppTile } from "../Logo";
import { Questions } from "../landing/Questions";
import { SiteFooter } from "../landing/SiteFooter";
import { deckIntro, deckQuestions, listedSections } from "./deck-content";
import { PreviewFace } from "./PreviewFace";

interface LocaleProps {
  locale: Locale;
}

interface DeckProps extends LocaleProps {
  deck: PublicDeckOut;
}

/** Server-rendered parts of the page share one provider each; only the nav, sections and stack hydrate. */
function Localized({ locale, children }: LocaleProps & { children: ReactNode }) {
  return <I18nProvider i18n={pageI18n(locale)}>{children}</I18nProvider>;
}

/** The edition the page was read in rides to the product, which pins it on the membership. */
export function addUrl(slug: string, edition?: string | undefined): string {
  return productUrl(`/add/${slug}${edition ? `?edition=${edition}` : ""}`);
}

/** The edition a page shows, or nothing when it shows the deck's own words. */
export function editionOf(
  deck: Pick<PublicDeckOut, "meaningLanguage" | "originalMeaningLanguage">,
) {
  return deck.meaningLanguage === deck.originalMeaningLanguage ? undefined : deck.meaningLanguage;
}

function useDate() {
  const { i18n } = useLingui();
  return (iso: string) =>
    new Intl.DateTimeFormat(i18n.locale, { dateStyle: "long", timeZone: "UTC" }).format(
      new Date(iso),
    );
}

/**
 * The publisher's photo over the mark it falls back to. This page is server-rendered with no
 * island, so the fallback is layered rather than swapped on an error event: a photo that fails
 * collapses to nothing and the mark behind it shows through.
 */
function PublisherMark({
  publisher,
  photo,
  locale,
}: {
  publisher: string;
  photo: string | null;
  locale: string;
}) {
  const letter = (
    <span
      aria-hidden="true"
      className="grid size-7 place-items-center rounded-full bg-text text-sm font-semibold text-canvas"
    >
      {publisher.trim().charAt(0).toLocaleUpperCase(locale)}
    </span>
  );
  // No photo: Lymi's own decks carry the lantern, which is a squircle and stands on its own.
  if (!photo) {
    return (
      <span className="shrink-0">
        {publisher.trim().toLowerCase() === "lymi" ? <AppTile size={28} /> : letter}
      </span>
    );
  }
  // A photo is round, so what sits behind it is the round plate; the tile's corners would show.
  return (
    <span className="relative grid size-7 shrink-0 place-items-center">
      {letter}
      <img
        src={photo}
        alt=""
        width={28}
        height={28}
        className="image-edge absolute inset-0 size-7 rounded-full object-cover"
      />
    </span>
  );
}

/** Who made the deck. A catalog card can show the same line. */
export function DeckByline({ deck }: { deck: PublicDeckOut }) {
  const { i18n } = useLingui();
  const date = useDate();
  const publisher = deck.publisher;
  // Served by the product Worker: the site Worker reads D1 but holds no image bucket.
  const photo = deck.publisherAvatar
    ? productUrl(publisherAvatarPath(deck.slug, deck.publisherAvatar))
    : null;
  const checked = deck.reviewedAt ? date(deck.reviewedAt) : null;
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-md">
      <PublisherMark publisher={publisher} photo={photo} locale={i18n.locale} />
      <span className="font-medium text-text">
        <Trans>By {publisher}</Trans>
      </span>
      {checked && (
        <span className="text-muted before:me-2.5 before:text-faint before:content-['·']">
          <Trans>Checked {checked}</Trans>
        </span>
      )}
    </p>
  );
}

/** The language the deck teaches or else its subject, and how many cards it holds. */
export function DeckFacts({ deck }: { deck: PublicDeckOut }) {
  const { i18n } = useLingui();
  const shelf =
    languageName(taughtLanguage(deck), i18n.locale, { label: true }) ?? deckSubject(i18n, deck);
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-md text-muted">
      {shelf && (
        <>
          <span>{shelf}</span>
          <span aria-hidden="true" className="text-faint">
            ·
          </span>
        </>
      )}
      <span>
        <Plural value={deck.cardCount} one="# card" other="# cards" />
      </span>
    </p>
  );
}

/** What the deck is about, as plain chips. They lead nowhere until a tag has a page of its own. */
function DeckTags({ deck }: { deck: PublicDeckOut }) {
  const { i18n, t } = useLingui();
  if (deck.tags.length === 0) return null;
  return (
    <ul aria-label={t`Tags`} className="flex flex-wrap justify-center gap-1.5">
      {deck.tags.map((tag) => (
        <li
          key={tag}
          className="inline-flex h-7 items-center rounded-full bg-plate-2 px-3 text-sm font-medium text-text-2"
        >
          {tagLabel(i18n, tag)}
        </li>
      ))}
    </ul>
  );
}

/** More like this: the published decks nearest this one, on the trays Explore draws them on. */
export function DeckRelated({ decks, locale }: LocaleProps & { decks: PublicDeckSummary[] }) {
  if (decks.length === 0) return null;
  return (
    <Localized locale={locale}>
      <section
        aria-labelledby="related-title"
        className="border-t border-edge px-5 py-16 @2xl:px-10 @4xl:py-24"
      >
        <div className="mx-auto max-w-[1040px]">
          <h2
            id="related-title"
            className="text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl"
          >
            <Trans>More like this</Trans>
          </h2>
          <ul className="deck-shelf mt-4">
            {decks.map((deck) => (
              <li key={deck.slug}>
                <DeckTile deck={deck} hue={trayHue(deck.slug)} locale={locale} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Localized>
  );
}

/**
 * The first cards of each section as plain text, with a short opening written from the deck's
 * facts. The full list stays in its view; this is what a reader and a crawler see without opening it.
 */
export function DeckWords({ deck, locale }: DeckProps) {
  return (
    <Localized locale={locale}>
      <DeckWordsBody deck={deck} />
    </Localized>
  );
}

function DeckWordsBody({ deck }: { deck: PublicDeckOut }) {
  const { i18n } = useLingui();
  const sections = listedSections(deck);
  if (sections.length === 0) return null;
  const intro = deckIntro(i18n, deck);
  const cardCount = deck.cardCount;
  return (
    <section
      id="words"
      aria-labelledby="words-title"
      className="scroll-mt-6 border-t border-edge px-5 py-16 @2xl:px-10 @4xl:py-24"
    >
      <div className="mx-auto max-w-[1040px]">
        <h2
          id="words-title"
          className="text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl"
        >
          <Trans>What you’ll learn</Trans>
        </h2>
        <div className="mt-4 grid max-w-[62ch] gap-2 text-md text-pretty text-text-2">
          {intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-10 grid gap-x-10 gap-y-8 @2xl:grid-cols-2 @4xl:grid-cols-3">
          {sections.map((section, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: section names can repeat; order is fixed.
            <div key={index} className="min-w-0">
              {section.name && (
                <h3
                  lang={deck.meaningLanguage}
                  className="text-lg font-medium tracking-[-0.02em] text-balance text-text"
                >
                  {section.name}
                </h3>
              )}
              <ul className="mt-3 grid gap-1.5 border-t border-edge pt-3">
                {section.cards.map((card, at) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: terms can repeat; order is fixed.
                  <li key={at} className="grid gap-0.5 text-md">
                    <span
                      lang={deck.language ?? undefined}
                      className="font-medium break-words whitespace-pre-line text-text"
                    >
                      {card.term}
                    </span>
                    {card.meaning && (
                      <span
                        lang={deck.meaningLanguage}
                        className="line-clamp-2 text-sm text-pretty text-text-2"
                      >
                        {card.meaning}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <MoreInSection left={section.total - section.cards.length} />
            </div>
          ))}
        </div>
        <p className="mt-10">
          <a href="#cards" className={buttonClass("secondary", "lg")}>
            <Plural value={cardCount} one="See the card" other="See all # cards" />
            <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
          </a>
        </p>
      </div>
    </section>
  );
}

function MoreInSection({ left }: { left: number }) {
  if (left <= 0) return null;
  return (
    <p className="mt-2 text-sm text-muted">
      <Plural value={left} one="And # more card" other="And # more cards" />
    </p>
  );
}

/** Plain questions about this deck, all open; the page's FAQPage repeats exactly these answers. */
export function DeckQuestions({ deck, locale }: DeckProps) {
  return (
    <Localized locale={locale}>
      <Questions title={<Trans>Questions</Trans>} items={deckQuestions(deck)} />
    </Localized>
  );
}

const LINK_CHIP =
  "inline-flex h-10 items-center gap-2 rounded-full bg-plate-2 px-4 text-md font-medium text-text transition-colors duration-150 hoverable:hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:h-11";

/** One row of plain links to other decks, each named as Explore names it, with its card count. */
function DeckLinkRow({
  id,
  title,
  decks,
  locale,
}: LocaleProps & { id: string; title: ReactNode; decks: PublicDeckSummary[] }) {
  if (decks.length === 0) return null;
  return (
    <div>
      <h2 id={id} className="text-sm text-muted">
        {title}
      </h2>
      <ul aria-labelledby={id} className="mt-3 flex flex-wrap gap-2">
        {decks.map((deck) => (
          <li key={deck.slug}>
            <a href={deckPath(deck.slug, locale)} className={LINK_CHIP}>
              <span lang={deck.meaningLanguage}>{deck.name}</span>
              <span className="text-sm text-muted tabular-nums">{deck.cardCount}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Links to the deck's shelf, the other decks in its language, and the same topic in other
 * languages, so search reaches every deck from its neighbours and not only from Explore.
 */
export function DeckNeighbours({ deck, links, locale }: DeckProps & { links: DeckLinks }) {
  return (
    <Localized locale={locale}>
      <DeckNeighboursBody deck={deck} links={links} locale={locale} />
    </Localized>
  );
}

function DeckNeighboursBody({ deck, links, locale }: DeckProps & { links: DeckLinks }) {
  const { i18n, t } = useLingui();
  const language = languageName(taughtLanguage(deck), i18n.locale, { label: true });
  const shelfName = links.shelf ? shelfLabel(i18n, links.shelf) : null;
  if (!links.shelf && links.language.length === 0 && links.topic.length === 0) return null;
  return (
    <nav aria-label={t`Related decks`} className="border-t border-edge px-5 py-12 @2xl:px-10">
      <div className="mx-auto grid max-w-[1040px] gap-8">
        <DeckLinkRow
          id="language-decks"
          locale={locale}
          decks={links.language}
          title={language ? <Trans>More {language} decks</Trans> : <Trans>More decks</Trans>}
        />
        <DeckLinkRow
          id="topic-decks"
          locale={locale}
          decks={links.topic}
          title={<Trans>The same topic in other languages</Trans>}
        />
        {links.shelf && shelfName && (
          <p>
            <a
              href={shelfPath(links.shelf.route, locale)}
              className={`${LINK_CHIP} bg-transparent shadow-[inset_0_0_0_1px_var(--edge-2)]`}
            >
              <Trans>All {shelfName} decks</Trans>
              <ChevronRight aria-hidden="true" className="size-4 text-muted rtl:rotate-180" />
            </a>
          </p>
        )}
      </div>
    </nav>
  );
}

/** The last quiet line of the page: how much there is, and when the publisher put it out. */
export function DeckFooterFacts({ deck, locale }: DeckProps) {
  return (
    <Localized locale={locale}>
      <DeckFooterFactsLine deck={deck} />
    </Localized>
  );
}

function DeckFooterFactsLine({ deck }: { deck: PublicDeckOut }) {
  const date = useDate();
  return (
    <p className="px-5 pb-16 text-center text-sm text-muted @2xl:px-10">
      <Trans>Published {date(deck.publishedAt)}</Trans>
    </p>
  );
}

// Each card's height and tilt, by place from the start, for spreads of one to five cards.
const POSES: [number, number][][] = [
  [[10, -2]],
  [
    [24, -3],
    [4, 3],
  ],
  [
    [30, -4],
    [4, 2.5],
    [26, -2],
  ],
  [
    [40, -4.5],
    [6, 3],
    [28, -2],
    [0, 4],
  ],
  [
    [46, -5],
    [6, 3],
    [30, -1.5],
    [0, 4],
    [40, -3.5],
  ],
];

/** A few of the deck's cards floating apart, so the first thing a visitor sees is what they get. */
function DeckSpread({ deck, cards }: { deck: PublicDeckOut; cards: DeckCard[] }) {
  const { t } = useLingui();
  const poses = POSES[cards.length - 1] ?? [];
  return (
    <ul aria-label={t`Cards from this deck`} className="deck-spread">
      {cards.map((card, index) => {
        const offset = index - (cards.length - 1) / 2;
        const [lift, tilt] = poses[index] ?? [0, 0];
        const style = {
          "--o": offset,
          "--a": Math.abs(offset),
          "--y": `${lift}px`,
          "--r": `${tilt}deg`,
          "--dur": `${6.5 + ((index * 7) % 5) * 0.6}s`,
          "--delay": `${-index * 1.3}s`,
          "--wob": `${index % 2 ? 0.7 : -0.7}deg`,
        } as CSSProperties;
        return (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed spread; a term can repeat.
            key={index}
            className="deck-spread-card"
            data-outer={Math.abs(offset) > 1 || undefined}
            style={style}
          >
            <div className="deck-spread-float">
              <article className="deck-spread-face">
                <PreviewFace
                  kind="deck-spread"
                  {...card}
                  language={deck.language}
                  meaningLanguage={deck.meaningLanguage}
                />
              </article>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The name, who made it, what it is, the way to add it, and a few of its cards. */
export function DeckHero({
  deck,
  locale,
  spread,
  canTry,
}: DeckProps & { spread: DeckCard[]; canTry: boolean }) {
  const exam = examOfDeck(deck.slug);
  return (
    <Localized locale={locale}>
      <div className="mx-auto max-w-[1120px] px-5 pt-8 pb-10 text-center @2xl:px-10 @4xl:pt-12 @4xl:pb-16">
        <DeckByline deck={deck} />
        <h1
          lang={deck.meaningLanguage}
          className="mx-auto mt-4 max-w-[16ch] text-5xl leading-[0.98] font-medium tracking-[-0.04em] text-balance break-words text-text @2xl:text-[3.75rem] @4xl:text-[4.5rem]"
        >
          {deck.name}
        </h1>
        <p
          lang={deck.meaningLanguage}
          className="mx-auto mt-5 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl"
        >
          {deck.summary}
        </p>
        <div className="mt-4 grid justify-items-center gap-4">
          <DeckFacts deck={deck} />
          <DeckTags deck={deck} />
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <a href={addUrl(deck.slug, editionOf(deck))} className={buttonClass("primary", "lg")}>
            <Trans>Add to Lymi</Trans>
          </a>
          {canTry && (
            <a href="#try" className={buttonClass("ghost", "lg")}>
              <Trans>Try a few cards</Trans>
            </a>
          )}
        </div>
        <p className="mx-auto mt-4 max-w-[46ch] text-sm text-pretty text-muted">
          <Trans>
            Lymi is a flashcard app: it brings each card back right before you’d forget it. Free to
            use.
          </Trans>
        </p>
        {exam && <ExamPageLink locale={locale} exam={exam} className="mt-3" />}
        {spread.length > 0 && <DeckSpread deck={deck} cards={spread} />}
      </div>
    </Localized>
  );
}

/** Three steps from this page to a deck that is learnt, beside a stack of its cards to turn over. */
export function DeckHowItWorks({ locale, cue }: LocaleProps & { cue: RecallCue }) {
  const items = [
    {
      key: "add",
      title: <Trans>Add the deck</Trans>,
      body: (
        <Trans>Sign in with Google or an email address, and it joins your Library, free.</Trans>
      ),
    },
    {
      key: "recall",
      title: <Trans>Recall, then turn it over</Trans>,
      body:
        cue === "image" ? (
          <Trans>
            Name what the picture shows before you look. Try it on the cards here: they’re from all
            over the deck.
          </Trans>
        ) : cue === "meaning" ? (
          <Trans>
            Read the meaning, then try to recall the term before you look. Try it on the cards here:
            they’re from all over the deck.
          </Trans>
        ) : cue === "mixed" ? (
          <Trans>
            Try to remember the answer before you look. Try it on the cards here: they’re from all
            over the deck.
          </Trans>
        ) : (
          <Trans>
            Try to remember the meaning before you look. Try it on the cards here: they’re from all
            over the deck.
          </Trans>
        ),
    },
    {
      key: "review",
      title: <Trans>Review a few minutes a day</Trans>,
      body: (
        <Trans>
          Choose how many cards a day. Lymi brings each one back right before you’d forget it.
        </Trans>
      ),
    },
  ];
  return (
    <Localized locale={locale}>
      <div className="min-w-0">
        <h2
          id="how-title"
          className="text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl"
        >
          <Trans>How it works</Trans>
        </h2>
        <ol className="mt-8 grid gap-6">
          {items.map((item, index) => (
            <li key={item.key} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-plate-2 text-sm font-semibold text-text-2 tabular-nums"
              >
                {index + 1}
              </span>
              <div className="pt-1">
                <h3 className="text-lg font-medium tracking-[-0.02em] text-text">{item.title}</h3>
                <p className="mt-1 max-w-[40ch] text-md text-pretty text-text-2">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Localized>
  );
}

interface GoneProps extends LocaleProps {
  status: 404 | 410;
}

/** A calm page for a deck that was withdrawn or never existed. */
export function DeckGone({ status, locale }: GoneProps) {
  return (
    <Localized locale={locale}>
      <main className="mx-auto grid w-full max-w-xl content-center px-5 py-20 text-center">
        <h1 className="text-3xl font-medium tracking-[-0.02em] text-balance text-text @2xl:text-4xl">
          {status === 410 ? (
            <Trans>This deck is no longer published.</Trans>
          ) : (
            <Trans>There is no deck at this address.</Trans>
          )}
        </h1>
        <p className="mt-4 text-md text-pretty text-text-2">
          {status === 410 ? (
            <Trans>
              Its publisher took it off Lymi’s public pages. Anyone who already added it keeps
              studying it in Lymi.
            </Trans>
          ) : (
            <Trans>The link may have a typo, or this deck was never published.</Trans>
          )}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <a href={localizedPath("landing", locale)} className={buttonClass("secondary", "lg")}>
            <Trans>Back to Lymi</Trans>
          </a>
        </div>
      </main>
    </Localized>
  );
}

interface FooterProps extends LocaleProps {
  languagePaths: Record<Locale, string>;
}

export function DeckFooter({ locale, languagePaths }: FooterProps) {
  return (
    <Localized locale={locale}>
      <SiteFooter openAppUrl={openLymiUrl()} paths={languagePaths} />
    </Localized>
  );
}
