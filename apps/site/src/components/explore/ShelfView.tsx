import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { List } from "lucide-react";
import { isExamShelf } from "../../lib/exams";
import { explorePath, type Shelf, type ShelfRoute, shelfPath, shelfRoute } from "../../lib/explore";
import type { Locale } from "../../lib/routes";
import { trayHue } from "../../lib/tray";
import { Breadcrumb } from "../Breadcrumb";
import { ExamPageLink } from "../exams/ExamPageLink";
import { Localized } from "../Localized";
import { Questions } from "../landing/Questions";
import { Section } from "../landing/Section";
import { DeckTile } from "./DeckTile";
import { shelfLabel } from "./explore-labels";
import type { ShelfCopy } from "./shelf-copy";

interface LocaleProps {
  locale: Locale;
}

/**
 * The shelf's name over a still pool of its own colour, with no picture: the page holds many decks,
 * and a card or a hand up here would read as one deck's page.
 */
export function ShelfHero({
  locale,
  shelf,
  copy,
}: LocaleProps & { shelf: Shelf; copy: ShelfCopy }) {
  return (
    <Localized locale={locale}>
      <ShelfHeroContent locale={locale} shelf={shelf} copy={copy} />
    </Localized>
  );
}

function ShelfHeroContent({
  locale,
  shelf,
  copy,
}: LocaleProps & { shelf: Shelf; copy: ShelfCopy }) {
  const { i18n } = useLingui();
  const cards = shelf.decks.reduce((sum, deck) => sum + deck.cardCount, 0);
  return (
    <div className="mx-auto max-w-[1120px] px-5 pt-8 pb-2 @2xl:px-10 @4xl:pt-12">
      <Breadcrumb
        parent={{ href: explorePath(locale), label: <Trans>Explore</Trans> }}
        here={shelfLabel(i18n, shelf)}
      />
      <h1 className="mt-5 max-w-[18ch] text-5xl leading-[0.98] font-medium tracking-[-0.04em] text-balance text-ink @4xl:text-[4rem]">
        {copy.title}
      </h1>
      <p className="mt-4 max-w-[52ch] text-lg text-pretty text-ink-secondary @2xl:text-xl">
        {copy.lede}
      </p>
      {isExamShelf(shelfRoute(shelf)) && <ExamPageLink locale={locale} className="mt-4" />}
      <p className="mt-3 text-sm text-ink-muted tabular-nums">
        <Plural value={shelf.decks.length} one="# deck" other="# decks" />
        <span aria-hidden="true" className="px-1.5 text-ink-faint">
          ·
        </span>
        <Plural value={cards} one="# card" other="# cards" />
      </p>
    </div>
  );
}

/** Every deck on the shelf, in Explore's order and Explore's tiles. */
export function ShelfDecks({ locale, shelf }: LocaleProps & { shelf: Shelf }) {
  return (
    <Localized locale={locale}>
      <ShelfDecksList locale={locale} shelf={shelf} />
    </Localized>
  );
}

function ShelfDecksList({ locale, shelf }: LocaleProps & { shelf: Shelf }) {
  const { i18n, t } = useLingui();
  const label = shelfLabel(i18n, shelf);
  return (
    <section aria-labelledby="decks-title">
      <h2 id="decks-title" className="sr-only">
        {t`${label} decks`}
      </h2>
      <ul className="deck-shelf border-t border-edge">
        {shelf.decks.map((deck) => (
          <li key={deck.slug}>
            <DeckTile deck={deck} hue={trayHue(deck.slug)} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What the shelf is, then the questions people ask about it; the FAQPage schema reads the same. */
export function ShelfAbout({
  locale,
  copy,
  heading,
}: LocaleProps & { copy: ShelfCopy; heading: string }) {
  return (
    <Localized locale={locale}>
      <Section>
        <Section.Title size="sm">{heading}</Section.Title>
        <div className="mt-5 grid max-w-[62ch] gap-3 text-md text-pretty text-ink-secondary">
          {copy.about.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </Section>
      <Questions title={<Trans>Questions</Trans>} items={copy.questions} />
    </Localized>
  );
}

/** The other shelves of the same kind that have a page, and the way back to all of Explore. */
export function ShelfMore({
  locale,
  others,
  languages,
}: LocaleProps & { others: { shelf: Shelf; route: ShelfRoute }[]; languages: boolean }) {
  return (
    <Localized locale={locale}>
      <ShelfMoreLinks locale={locale} others={others} languages={languages} />
    </Localized>
  );
}

function ShelfMoreLinks({
  locale,
  others,
  languages,
}: LocaleProps & { others: { shelf: Shelf; route: ShelfRoute }[]; languages: boolean }) {
  const { i18n, t } = useLingui();
  const chip =
    "inline-flex h-10 items-center gap-2 rounded-full whitespace-nowrap px-4 text-md font-medium text-ink transition-colors duration-150 hoverable:hover:bg-plate-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:h-11";
  return (
    <nav aria-labelledby="more-shelves" className="border-b border-edge px-5 py-12 @2xl:px-10">
      <div className="mx-auto max-w-[1040px]">
        {others.length > 0 && (
          <h2 id="more-shelves" className="text-sm text-ink-muted">
            {languages ? <Trans>More languages</Trans> : <Trans>Other subjects</Trans>}
          </h2>
        )}
        <ul className={`flex flex-wrap gap-2 ${others.length > 0 ? "mt-3" : ""}`}>
          {others.map(({ shelf, route }) => (
            <li key={shelf.key}>
              <a href={shelfPath(route, locale)} className={`${chip} bg-plate-nested`}>
                {shelfLabel(i18n, shelf)}
                <span className="text-sm text-ink-muted tabular-nums">{shelf.decks.length}</span>
              </a>
            </li>
          ))}
          <li>
            <a
              href={explorePath(locale)}
              className={`${chip} shadow-[inset_0_0_0_1px_var(--edge-strong)]`}
            >
              <List aria-hidden="true" className="size-4 text-ink-muted" />
              <Trans>All of Explore</Trans>
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
