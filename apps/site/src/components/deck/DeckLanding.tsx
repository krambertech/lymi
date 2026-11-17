import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { exampleShown, type SectionProgression } from "@lymi/core";
import { type PublicDeckOut, type PublicDeckSummary, taughtLanguage } from "@lymi/core/catalog";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  type DeckCard,
  deckLevel,
  deckPath,
  languageName,
  levelName,
  type RecallCue,
  type SectionStep,
} from "../../lib/deck-page";
import { examOfDeck } from "../../lib/exams";
import { publicMediaUrl } from "../../lib/origins";
import type { Locale } from "../../lib/routes";
import { deckSubject } from "../../lib/subjects";
import { buttonClass } from "../Button";
import { ExamPageLink } from "../exams/ExamPageLink";
import { Localized } from "../Localized";
import { addUrl, DeckByline, DeckTags, editionOf } from "./DeckView";

interface DeckProps {
  deck: PublicDeckOut;
  locale: Locale;
}

/** Where an Add press came from, sent with `add_to_lymi_clicked`. */
export type AddPlace = "hero" | "try" | "inside" | "closing" | "sticky";

/** The one action the page asks for, everywhere it asks. */
export function AddButton({
  deck,
  place,
  size = "lg",
  className,
}: {
  deck: PublicDeckOut;
  place: AddPlace;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <a
      href={addUrl(deck.slug, editionOf(deck))}
      data-add={place}
      className={buttonClass("primary", size, className)}
    >
      <Trans>Add free deck</Trans>
    </a>
  );
}

/**
 * The first screen answers what a visitor arriving from a search asks first: is this the list I
 * looked for, is it any good, and what does it cost. Words on one side, the deck's first words on
 * the other, and one way to add it.
 */
export function DeckLandingHero({
  deck,
  locale,
  spread,
  canTry,
}: DeckProps & { spread: DeckCard[]; canTry: boolean }) {
  return (
    <Localized locale={locale}>
      <div className="mx-auto grid max-w-[1120px] grid-cols-[minmax(0,1fr)] items-center gap-8 px-5 pt-6 pb-12 @2xl:px-10 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] @4xl:gap-12 @4xl:pt-12 @4xl:pb-20">
        <HeroWords deck={deck} locale={locale} canTry={canTry} />
        {spread.length > 0 && <HeroFan deck={deck} cards={spread} />}
      </div>
    </Localized>
  );
}

/**
 * Three of the deck's first cards fanned out, each shown whole as a turned card is: its picture,
 * term, meaning and example. The first thing a visitor sees is what they would learn, and how
 * much a card holds. Still: the cards to turn over are further down.
 */
function HeroFan({ deck, cards }: { deck: PublicDeckOut; cards: DeckCard[] }) {
  const { t } = useLingui();
  const shown = cards.slice(0, 3);
  // The first card in front, the next two behind it to either side.
  const order = shown.length === 3 ? [1, 0, 2] : shown.map((_, i) => i);
  return (
    <div className="grid justify-items-center gap-4">
      <ul aria-label={t`Cards from this deck`} className="hero-fan" data-count={shown.length}>
        {order.map((at, place) => {
          const card = shown[at];
          if (!card) return null;
          return (
            <li
              key={at}
              className="hero-fan-card"
              data-place={shown.length === 3 ? ["start", "front", "end"][place] : "front"}
            >
              <OpenCard deck={deck} card={card} />
            </li>
          );
        })}
      </ul>
      <a
        href="#inside"
        className="inline-flex items-center gap-1 rounded-xs text-md font-medium text-ink hoverable:hover:underline hoverable:hover:underline-offset-4"
      >
        <Plural value={deck.cardCount} _1="See the card" other="See all # cards" />
        <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
      </a>
    </div>
  );
}

/** One card lying turned over: what review shows once the answer is up. */
function OpenCard({ deck, card }: { deck: PublicDeckOut; card: DeckCard }) {
  const { example, exampleTranslation, pronunciation } = card.details ?? {};
  return (
    <article className="hero-fan-face">
      {card.section && (
        <p
          lang={card.sectionLanguage ?? deck.meaningLanguage}
          className="truncate text-xs font-medium tracking-[0.06em] text-ink-muted uppercase"
        >
          {card.section}
        </p>
      )}
      {card.image && (
        <img
          src={publicMediaUrl(card.image.cardId, "image")}
          alt={card.image.description}
          width={card.image.width}
          height={card.image.height}
          decoding="async"
          className="hero-fan-picture"
        />
      )}
      <p
        lang={deck.language ?? undefined}
        dir="auto"
        className="mt-2 line-clamp-2 text-[1.625rem] leading-[1.1] font-medium tracking-[-0.025em] text-ink [overflow-wrap:anywhere]"
      >
        {firstLine(card.term)}
      </p>
      {pronunciation && (
        <p className="hand-ipa mt-1 truncate text-sm text-ink-muted">{pronunciation}</p>
      )}
      <div className="mt-auto border-t border-edge-strong pt-3">
        <p lang={deck.meaningLanguage} className="line-clamp-2 text-md text-ink">
          {firstLine(card.meaning)}
        </p>
        {example && (
          <div className="mt-2.5 rounded-lg bg-plate-nested px-3 py-2">
            <p
              lang={deck.language ?? undefined}
              dir="auto"
              className="line-clamp-2 text-sm text-ink"
            >
              {exampleShown(example)}
            </p>
            {exampleTranslation && (
              <p lang={deck.meaningLanguage} className="line-clamp-1 text-xs text-ink-muted">
                {exampleTranslation}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function HeroWords({ deck, locale, canTry }: DeckProps & { canTry: boolean }) {
  const { i18n } = useLingui();
  const exam = examOfDeck(deck.slug);
  const taught = languageName(taughtLanguage(deck), i18n.locale, { label: true });
  const subject = taught ?? deckSubject(i18n, deck);
  const meanings = languageName(deck.meaningLanguage, i18n.locale);
  return (
    <div className="grid min-w-0 justify-items-center text-center @4xl:justify-items-start @4xl:text-start">
      <DeckByline deck={deck} align="start" />
      <h1
        lang={deck.meaningLanguage}
        className="mt-4 max-w-[18ch] text-5xl leading-[0.98] font-medium tracking-[-0.04em] text-balance break-words text-ink @2xl:text-[3.5rem] @5xl:text-[4rem]"
      >
        {deck.name}
      </h1>
      <p
        lang={deck.meaningLanguage}
        className="mt-5 max-w-[46ch] text-lg text-pretty text-ink-secondary @2xl:text-xl"
      >
        {deck.summary}
      </p>
      {/* What a searcher checks before anything else, each on its own so it scans. */}
      <ul className="mt-5 flex flex-wrap justify-center gap-1.5 @4xl:justify-start">
        {subject && <Fact>{subject}</Fact>}
        {taught && meanings && (
          <Fact>
            <Trans>Meanings in {meanings}</Trans>
          </Fact>
        )}
        <Fact>
          <Plural value={deck.cardCount} one="# card" other="# cards" />
        </Fact>
        <Fact strong>
          <Trans>Free</Trans>
        </Fact>
      </ul>
      <div className="mt-4">
        <DeckTags deck={deck} align="start" />
      </div>
      <div className="mt-7 flex flex-wrap justify-center gap-2 @4xl:justify-start">
        <AddButton deck={deck} place="hero" />
        {canTry && (
          <a href="#try" className={buttonClass("ghost", "lg")}>
            <Trans>Try a few cards</Trans>
          </a>
        )}
      </div>
      <p className="mt-4 max-w-[46ch] text-sm text-pretty text-ink-muted">
        <Trans>
          Lymi is a free flashcard app. Sign in with Google or an email address, no payment details.
        </Trans>
      </p>
      {exam && <ExamPageLink locale={locale} exam={exam} className="mt-3" />}
    </div>
  );
}

function Fact({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return (
    <li
      className={
        strong
          ? "inline-flex h-8 items-center rounded-full bg-ink px-3.5 text-sm font-medium text-canvas"
          : "inline-flex h-8 items-center rounded-full bg-plate px-3.5 text-sm font-medium text-ink-secondary edge"
      }
    >
      {children}
    </li>
  );
}

/** A card's first line: a question's options and a list's rest wait for the full card. */
const firstLine = (text: string) => text.split("\n", 1)[0] ?? text;

/**
 * Every card in the deck, as text a search engine reads and a visitor can open section by section.
 * Rendered on the server with no island, so the list ships once and holds the whole deck.
 */
export function DeckContents({
  deck,
  locale,
  steps,
  inOrder,
}: DeckProps & { steps: SectionStep[]; inOrder: boolean }) {
  return (
    <Localized locale={locale}>
      <section
        id="inside"
        aria-labelledby="inside-title"
        className="scroll-mt-6 border-t border-edge px-5 py-16 @2xl:px-10 @4xl:py-24"
      >
        <div className="mx-auto max-w-[1040px]">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
            <h2
              id="inside-title"
              className="text-4xl font-medium tracking-[-0.03em] text-balance text-ink @2xl:text-5xl"
            >
              <Trans>What’s inside</Trans>
            </h2>
            <AddButton deck={deck} place="inside" size="md" />
          </div>
          <p className="mt-4 max-w-[62ch] text-md text-pretty text-ink-secondary">
            {inOrder ? (
              <Progression
                progression={deck.sectionProgression}
                first={steps[0]?.name ?? ""}
                firstLanguage={steps[0]?.nameLanguage ?? deck.meaningLanguage}
                sections={steps.filter((step) => step.position !== null).length}
                cards={deck.cardCount}
              />
            ) : (
              <Trans>
                Every card is open from the start, so any of them can come up in review.
              </Trans>
            )}
          </p>
          <AudioStatus />
          <div className="mt-8 grid gap-3">
            {steps.map((step, index) => (
              <SectionRows
                key={`${step.position ?? "rest"}-${step.name ?? ""}`}
                deck={deck}
                step={step}
                // The first section opens when it is short enough to read through; a long one waits.
                open={index === 0 && step.cards.length <= 24}
                start={index === 0 && inOrder && deck.sectionProgression !== "open"}
              />
            ))}
          </div>
        </div>
      </section>
    </Localized>
  );
}

/** Where the list says a word's pronunciation failed to play; the page's script fills it. */
function AudioStatus() {
  const { t } = useLingui();
  return (
    <p
      role="status"
      data-audio-status
      // Said once for the list: where each word's clip is and what its button says while it plays.
      data-audio-base={publicMediaUrl("{card}", "audio")}
      data-stop-label={t`Stop pronunciation`}
      data-failed={t`Pronunciation couldn’t play. Try again.`}
      className="mt-3 text-sm text-danger empty:hidden"
    />
  );
}

function Progression({
  progression,
  first,
  firstLanguage,
  sections,
  cards,
}: {
  progression: SectionProgression;
  first: string;
  firstLanguage: string;
  sections: number;
  cards: number;
}) {
  // Each count in its own plural, so a language that inflects the noun by number gets both right.
  const size = (
    <>
      <Plural value={cards} one="# card" other="# cards" />,{" "}
      <Plural value={sections} one="# section" other="# sections" />.
    </>
  );
  switch (progression) {
    case "open":
      return <Trans>{size} Every section is open, so any card can come up in review.</Trans>;
    case "manual":
      return (
        <Trans>
          {size} You start with <span lang={firstLanguage}>{first}</span>, and choose when to start
          the next once you know most of it.
        </Trans>
      );
    default:
      return (
        <Trans>
          {size} You start with <span lang={firstLanguage}>{first}</span>, and the next section
          opens as you learn the one before it.
        </Trans>
      );
  }
}

/** One section: its place, name, size and first words, opening onto every card in it. */
function SectionRows({
  deck,
  step,
  open,
  start,
}: {
  deck: PublicDeckOut;
  step: SectionStep;
  open: boolean;
  start: boolean;
}) {
  const named = step.name !== null;
  const preview = step.cards
    .filter((card) => card.meaning && card.term.length <= 24 && !card.term.includes("\n"))
    .slice(0, 4)
    .map((card) => card.term);
  return (
    <details open={open} className="deck-section group rounded-xl bg-plate edge">
      <summary className="flex cursor-pointer list-none items-center gap-4 rounded-xl px-4 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring @2xl:px-5 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className={
            start
              ? "grid size-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-canvas tabular-nums"
              : "grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-ink-secondary tabular-nums edge-strong"
          }
        >
          {step.position ?? "·"}
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span
              lang={named ? (step.nameLanguage ?? deck.meaningLanguage) : undefined}
              className="text-lg leading-tight font-medium tracking-[-0.012em] text-ink"
            >
              {named ? step.name : <Trans>Cards outside a section</Trans>}
            </span>
            {start && (
              <span className="text-sm font-medium text-success">
                <Trans>Start here</Trans>
              </span>
            )}
          </span>
          {preview.length > 0 && (
            <span lang={deck.language ?? undefined} className="truncate text-md text-ink-muted">
              {preview.join(" · ")}
            </span>
          )}
        </span>
        <span className="shrink-0 text-sm text-ink-muted tabular-nums">
          <Plural value={step.cards.length} one="# card" other="# cards" />
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <dl className="grid border-t border-edge px-4 pb-2 @2xl:px-5 @3xl:grid-cols-2 @3xl:gap-x-10">
        {step.cards.map((card, index) => (
          <CardRow
            // biome-ignore lint/suspicious/noArrayIndexKey: terms can repeat; the order is fixed.
            key={index}
            deck={deck}
            card={card}
          />
        ))}
      </dl>
    </details>
  );
}

function CardRow({ deck, card }: { deck: PublicDeckOut; card: SectionStep["cards"][number] }) {
  const { t } = useLingui();
  // Short class names: a deck of a thousand cards repeats every one a thousand times.
  return (
    <div className="deck-row" data-picture={card.image ? "" : undefined}>
      <dt>
        {card.image && (
          <img
            src={publicMediaUrl(card.image.cardId, "image")}
            alt={card.image.description}
            width={card.image.width}
            height={card.image.height}
            loading="lazy"
            decoding="async"
            className="deck-row-picture"
          />
        )}
        <span lang={deck.language ?? undefined} dir="auto">
          {card.term}
        </span>
        {card.audio && (
          <button type="button" data-audio={card.audio.cardId} aria-label={t`Play pronunciation`} />
        )}
      </dt>
      <dd lang={card.meaning === null ? undefined : deck.meaningLanguage}>
        {card.meaning ?? (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">
              <Trans>No meaning yet</Trans>
            </span>
          </>
        )}
      </dd>
    </div>
  );
}

/** Three steps from this page to a deck that is learnt, beside the cards to turn over. */
export function DeckHowItWorks({ locale, cue }: { locale: Locale; cue: RecallCue }) {
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
        <ol className="mt-8 grid gap-6">
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

/**
 * The same language's decks by level, A1 to B1 and on, so a visitor who finds this one too easy or
 * too hard steps to the next. Only decks whose slug names a level take a place.
 */
export function DeckLadder({
  deck,
  locale,
  rungs,
}: DeckProps & { rungs: (readonly [number, PublicDeckSummary | null])[] }) {
  if (rungs.length < 2) return null;
  return (
    <Localized locale={locale}>
      <LadderBody deck={deck} locale={locale} rungs={rungs} />
    </Localized>
  );
}

/**
 * The ladder's rungs: one deck per level for the language this one teaches, from the related decks
 * and the language's other decks, with this deck in its own place. Empty when this deck has no level.
 */
export function ladderRungs(
  deck: PublicDeckOut,
  candidates: readonly PublicDeckSummary[],
): (readonly [number, PublicDeckSummary | null])[] {
  const here = deckLevel(deck.slug);
  const language = taughtLanguage(deck)?.split("-")[0];
  if (here === null || !language) return [];
  const byLevel = new Map<number, PublicDeckSummary>();
  // A deck explained in the page's own language takes its level first.
  const ordered = [...candidates].sort(
    (a, b) =>
      Number(a.meaningLanguage !== deck.meaningLanguage) -
      Number(b.meaningLanguage !== deck.meaningLanguage),
  );
  for (const other of ordered) {
    const level = deckLevel(other.slug);
    if (level === null || level === here || byLevel.has(level)) continue;
    if (taughtLanguage(other)?.split("-")[0] !== language) continue;
    byLevel.set(level, other);
  }
  return [...byLevel.entries(), [here, null] as const].sort((a, b) => a[0] - b[0]);
}

function LadderBody({
  deck,
  locale,
  rungs,
}: DeckProps & { rungs: (readonly [number, PublicDeckSummary | null])[] }) {
  const { i18n } = useLingui();
  const language = languageName(taughtLanguage(deck), i18n.locale, { label: true }) ?? "";
  const exam = examOfDeck(deck.slug);
  return (
    <section
      aria-labelledby="ladder-title"
      className="border-t border-edge px-5 py-16 @2xl:px-10 @4xl:py-20"
    >
      <div className="mx-auto max-w-[1040px]">
        <h2
          id="ladder-title"
          className="text-4xl font-medium tracking-[-0.03em] text-balance text-ink @2xl:text-5xl"
        >
          <Trans>{language}, level by level</Trans>
        </h2>
        <ol className="mt-8 grid gap-3 @2xl:grid-flow-col @2xl:auto-cols-fr">
          {rungs.map(([level, other]) => (
            <li key={level}>
              {other ? (
                <a
                  href={deckPath(other.slug, locale)}
                  className="flex h-full flex-col gap-1 rounded-xl bg-plate p-4 edge transition-colors duration-150 hoverable:hover:bg-plate-hover"
                >
                  <span className="text-sm font-semibold text-ink-muted tabular-nums">
                    {levelName(level)}
                  </span>
                  <span lang={other.meaningLanguage} className="text-lg font-medium text-ink">
                    {other.name}
                  </span>
                  <span className="text-sm text-ink-muted">
                    <Plural value={other.cardCount} one="# card" other="# cards" />
                  </span>
                </a>
              ) : (
                <div
                  aria-current="page"
                  className="flex h-full flex-col gap-1 rounded-xl bg-ink p-4 text-canvas"
                >
                  <span className="text-sm font-semibold tabular-nums opacity-70">
                    {levelName(level)}
                  </span>
                  <span lang={deck.meaningLanguage} className="text-lg font-medium">
                    {deck.name}
                  </span>
                  <span className="text-sm opacity-70">
                    <Trans>You’re here</Trans>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ol>
        {exam && <ExamPageLink locale={locale} exam={exam} className="mt-6" />}
      </div>
    </section>
  );
}

/** On a phone, the way to add the deck stays in reach once the hero's button scrolls away. */
export function DeckStickyAdd({ deck, locale }: DeckProps) {
  return (
    <Localized locale={locale}>
      <div className="deck-sticky" data-deck-sticky>
        <span lang={deck.meaningLanguage} className="min-w-0 flex-1 truncate text-md font-medium">
          {deck.name}
        </span>
        <AddButton deck={deck} place="sticky" size="md" />
      </div>
    </Localized>
  );
}
