import { Plural, Trans, useLingui } from "@lingui/react/macro";
import {
  type PublicDeckOut,
  type PublicDeckSummary,
  publisherAvatarPath,
  taughtLanguage,
  trayHue,
} from "@lymi/core/catalog";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { DeckLinks } from "../../lib/deck-links";
import { deckPath, languageName, type RecallCue } from "../../lib/deck-page";
import { examOfDeck } from "../../lib/exams";
import { shelfPath } from "../../lib/explore";
import { openLymiUrl, productUrl } from "../../lib/origins";
import { type Locale, localizedPath } from "../../lib/routes";
import { deckSubject } from "../../lib/subjects";
import { buttonClass } from "../Button";
import { ExamPageLink } from "../exams/ExamPageLink";
import { DeckTile } from "../explore/DeckTile";
import { shelfLabel, tagLabel } from "../explore/explore-labels";
import { Localized } from "../Localized";
import { AppTile } from "../Logo";
import { SiteFooter } from "../landing/SiteFooter";

interface LocaleProps {
  locale: Locale;
}

interface DeckProps extends LocaleProps {
  deck: PublicDeckOut;
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
      className="grid size-7 place-items-center rounded-full bg-ink text-sm font-semibold text-canvas"
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
export function DeckByline({
  deck,
  align = "center",
}: {
  deck: PublicDeckOut;
  align?: HeroAlign | undefined;
}) {
  const { i18n } = useLingui();
  const date = useDate();
  const publisher = deck.publisher;
  // Served by the product Worker: the site Worker reads D1 but holds no image bucket.
  const photo = deck.publisherAvatar
    ? productUrl(publisherAvatarPath(deck.slug, deck.publisherAvatar))
    : null;
  const checked = deck.reviewedAt ? date(deck.reviewedAt) : null;
  const published = date(deck.publishedAt);
  return (
    <p
      className={`flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-md ${align === "start" ? "@4xl:justify-start" : ""}`}
    >
      <PublisherMark publisher={publisher} photo={photo} locale={i18n.locale} />
      <span className="font-medium text-ink">
        <Trans>By {publisher}</Trans>
      </span>
      {/* A check by the publisher says more than the day it went up, so it takes the place. */}
      <span className="text-ink-muted before:me-2.5 before:text-ink-faint before:content-['·']">
        {checked ? <Trans>Checked {checked}</Trans> : <Trans>Published {published}</Trans>}
      </span>
    </p>
  );
}

/** The language the deck teaches or else its subject, and how many cards it holds. */
export function DeckFacts({
  deck,
  align = "center",
}: {
  deck: PublicDeckOut;
  align?: HeroAlign | undefined;
}) {
  const { i18n } = useLingui();
  const shelf =
    languageName(taughtLanguage(deck), i18n.locale, { label: true }) ?? deckSubject(i18n, deck);
  return (
    <p
      className={`flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-md text-ink-muted ${align === "start" ? "@4xl:justify-start" : ""}`}
    >
      {shelf && (
        <>
          <span>{shelf}</span>
          <span aria-hidden="true" className="text-ink-faint">
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
function DeckTags({ deck, align }: { deck: PublicDeckOut; align: HeroAlign }) {
  const { i18n, t } = useLingui();
  if (deck.tags.length === 0) return null;
  return (
    <ul
      aria-label={t`Tags`}
      className={`flex flex-wrap justify-center gap-1.5 ${align === "start" ? "@4xl:justify-start" : ""}`}
    >
      {deck.tags.map((tag) => (
        <li
          key={tag}
          className="inline-flex h-7 items-center rounded-full bg-plate-nested px-3 text-sm font-medium text-ink-secondary"
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
            className="text-4xl font-medium tracking-[-0.03em] text-balance text-ink @2xl:text-5xl"
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

const LINK_CHIP =
  "inline-flex h-10 items-center gap-2 rounded-full bg-plate-nested px-4 text-md font-medium text-ink transition-colors duration-150 hoverable:hover:bg-plate-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:h-11";

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
      <h2 id={id} className="text-sm text-ink-muted">
        {title}
      </h2>
      <ul aria-labelledby={id} className="mt-3 flex flex-wrap gap-2">
        {decks.map((deck) => (
          <li key={deck.slug}>
            <a href={deckPath(deck.slug, locale)} className={LINK_CHIP}>
              <span lang={deck.meaningLanguage}>{deck.name}</span>
              <span className="text-sm text-ink-muted tabular-nums">{deck.cardCount}</span>
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
              className={`${LINK_CHIP} bg-transparent shadow-[inset_0_0_0_1px_var(--edge-strong)]`}
            >
              <Trans>All {shelfName} decks</Trans>
              <ChevronRight aria-hidden="true" className="size-4 text-ink-muted rtl:rotate-180" />
            </a>
          </p>
        )}
      </div>
    </nav>
  );
}

/** Where the hero's words sit: centred over what follows, or level with a card beside them. */
type HeroAlign = "center" | "start";

/** Who made the deck, its name, what it is, and the way to add it. */
export function DeckHeroText({
  deck,
  locale,
  align = "center",
}: DeckProps & {
  align?: HeroAlign | undefined;
}) {
  return (
    <Localized locale={locale}>
      <DeckHeroWords deck={deck} locale={locale} align={align} />
    </Localized>
  );
}

function DeckHeroWords({ deck, locale, align }: DeckProps & { align: HeroAlign }) {
  const exam = examOfDeck(deck.slug);
  const start = align === "start";
  return (
    <div
      className={
        start
          ? "grid justify-items-center text-center @4xl:justify-items-start @4xl:text-start"
          : "text-center"
      }
    >
      <DeckByline deck={deck} align={align} />
      <h1
        lang={deck.meaningLanguage}
        className={
          start
            ? "mt-4 max-w-[16ch] text-5xl leading-[0.98] font-medium tracking-[-0.04em] text-balance break-words text-ink @2xl:text-[3.5rem] @5xl:text-[4rem]"
            : "mx-auto mt-4 max-w-[16ch] text-5xl leading-[0.98] font-medium tracking-[-0.04em] text-balance break-words text-ink @2xl:text-[3.75rem] @4xl:text-[4.5rem]"
        }
      >
        {deck.name}
      </h1>
      <p
        lang={deck.meaningLanguage}
        className={`${start ? "" : "mx-auto "}mt-5 max-w-[44ch] text-lg text-pretty text-ink-secondary @2xl:text-xl`}
      >
        {deck.summary}
      </p>
      <div
        className={`mt-4 grid gap-4 ${start ? "justify-items-center @4xl:justify-items-start" : "justify-items-center"}`}
      >
        <DeckFacts deck={deck} align={align} />
        <DeckTags deck={deck} align={align} />
      </div>
      <div
        className={`mt-7 flex flex-wrap gap-2 ${start ? "justify-center @4xl:justify-start" : "justify-center"}`}
      >
        <a href={addUrl(deck.slug, editionOf(deck))} className={buttonClass("primary", "lg")}>
          <Trans>Add to Lymi</Trans>
        </a>
        {/* The full list opens over the page from #cards; the cards to try are already beside this. */}
        <a href="#cards" className={buttonClass("ghost", "lg")}>
          <Plural value={deck.cardCount} _1="See the card" other="See all # cards" />
        </a>
      </div>
      <p
        className={`${start ? "" : "mx-auto "}mt-4 max-w-[46ch] text-sm text-pretty text-ink-muted`}
      >
        <Trans>Lymi is a free flashcard app with spaced repetition.</Trans>
      </p>
      {exam && <ExamPageLink locale={locale} exam={exam} className="mt-3" />}
    </div>
  );
}

/** Three steps from this page to a deck that is learnt; the cards to try are in the hero. */
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
          <Trans>Name what the picture shows before you look, then turn the card over.</Trans>
        ) : cue === "meaning" ? (
          <Trans>
            Read the meaning and recall the term before you look, then turn the card over.
          </Trans>
        ) : cue === "mixed" ? (
          <Trans>Try to remember the answer before you look, then turn the card over.</Trans>
        ) : (
          <Trans>Try to remember the meaning before you look, then turn the card over.</Trans>
        ),
    },
    {
      key: "review",
      title: <Trans>Review a few minutes a day</Trans>,
      body: (
        <Trans>
          Choose how many cards a day. Cards you remember come back later, and the ones you forget
          come back sooner.
        </Trans>
      ),
    },
  ];
  return (
    <Localized locale={locale}>
      <div className="min-w-0">
        <h2
          id="how-title"
          className="text-4xl font-medium tracking-[-0.03em] text-balance text-ink @2xl:text-5xl"
        >
          <Trans>How it works</Trans>
        </h2>
        <ol className="mt-8 grid gap-6 @3xl:grid-cols-3 @3xl:gap-10">
          {items.map((item, index) => (
            <li key={item.key} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-plate-nested text-sm font-semibold text-ink-secondary tabular-nums"
              >
                {index + 1}
              </span>
              <div className="pt-1">
                <h3 className="text-lg font-medium tracking-[-0.02em] text-ink">{item.title}</h3>
                <p className="mt-1 max-w-[40ch] text-md text-pretty text-ink-secondary">
                  {item.body}
                </p>
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
        <h1 className="text-3xl font-medium tracking-[-0.02em] text-balance text-ink @2xl:text-4xl">
          {status === 410 ? (
            <Trans>This deck is no longer published.</Trans>
          ) : (
            <Trans>There is no deck at this address.</Trans>
          )}
        </h1>
        <p className="mt-4 text-md text-pretty text-ink-secondary">
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
  languagePaths: Partial<Record<Locale, string>>;
}

export function DeckFooter({ locale, languagePaths }: FooterProps) {
  return (
    <Localized locale={locale}>
      <SiteFooter openAppUrl={openLymiUrl()} paths={languagePaths} />
    </Localized>
  );
}
