import { I18nProvider } from "@lingui/react";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { PublicDeckOut } from "@lymi/core/catalog";
import { clsx } from "clsx";
import { ChevronDown, Lock, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { languageName, type SectionStep, sectionPath } from "../../lib/deck-page";
import { pageI18n } from "../../lib/i18n";
import { productUrl } from "../../lib/origins";
import { type Locale, localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { SiteFooter } from "../landing/SiteFooter";

interface LocaleProps {
  locale: Locale;
}

interface DeckProps extends LocaleProps {
  deck: PublicDeckOut;
}

/** Server-rendered parts of the page share one provider each; only the nav and Try it hydrate. */
function Localized({ locale, children }: LocaleProps & { children: ReactNode }) {
  return <I18nProvider i18n={pageI18n(locale)}>{children}</I18nProvider>;
}

export function addUrl(slug: string): string {
  return productUrl(`/add/${slug}`);
}

function useDate() {
  const { i18n } = useLingui();
  return (iso: string) =>
    new Intl.DateTimeFormat(i18n.locale, { dateStyle: "long", timeZone: "UTC" }).format(
      new Date(iso),
    );
}

/** Who made the deck, first thing under its name. A catalog card can show the same line. */
export function DeckByline({ deck }: { deck: PublicDeckOut }) {
  const date = useDate();
  const publisher = deck.publisher;
  const checked = deck.reviewedAt ? date(deck.reviewedAt) : null;
  return (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-md">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-plate text-sm font-semibold text-text edge"
      >
        {publisher.trim().charAt(0).toLocaleUpperCase()}
      </span>
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

/** The deck at a glance. A catalog card can show the same facts. */
export function DeckFacts({ deck }: { deck: PublicDeckOut }) {
  const { i18n } = useLingui();
  const language = languageName(deck.language, i18n.locale, { label: true });
  const meaningLanguage = languageName(deck.meaningLanguage, i18n.locale);
  const namedSections = deck.sections.filter((section) => section.name !== null).length;
  const level = deck.level;
  const items = [
    language,
    level && <Trans key="level">Level {level}</Trans>,
    <Plural key="cards" value={deck.cardCount} one="# card" other="# cards" />,
    namedSections > 1 && (
      <Plural key="sections" value={namedSections} one="# section" other="# sections" />
    ),
    meaningLanguage && <Trans key="meanings">Meanings in {meaningLanguage}</Trans>,
  ].filter(Boolean);
  // Each item carries its dot at its start and the list is pulled back by one dot's width, so a
  // dot that would start a wrapped line is clipped away.
  return (
    <div className="overflow-hidden">
      <ul className="-ms-5 flex flex-wrap items-center gap-y-1 text-md text-text-2">
        {items.map((item, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that never reorders.
            key={index}
            className="relative ps-5 before:absolute before:start-0 before:w-5 before:text-center before:text-faint before:content-['·']"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SignInNote() {
  return (
    <p className="text-sm text-muted">
      <Trans>You’ll sign in with Google to add it.</Trans>
    </p>
  );
}

/** The name, who made it, what it is, and the way to add it. Try it sits beside this. */
export function DeckHeader({ deck, locale }: DeckProps) {
  const { inOrder } = sectionPath(deck);
  return (
    <Localized locale={locale}>
      <div className="min-w-0 max-w-[560px]">
        <h1
          lang={deck.meaningLanguage}
          className="text-5xl font-medium tracking-[-0.038em] text-balance break-words text-text @4xl:text-[4rem] @4xl:leading-[1]"
        >
          {deck.name}
        </h1>
        <div className="mt-5">
          <DeckByline deck={deck} />
        </div>
        <p
          lang={deck.meaningLanguage}
          className="mt-6 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl"
        >
          {deck.summary}
        </p>
        <div className="mt-5">
          <DeckFacts deck={deck} />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-3">
          <a href={addUrl(deck.slug)} className={buttonClass("primary", "lg")}>
            <Trans>Add to Lymi</Trans>
          </a>
          <a href="#sections" className={buttonClass("ghost", "lg")}>
            {inOrder ? <Trans>See the sections</Trans> : <Trans>See every card</Trans>}
          </a>
        </div>
        <div className="mt-3">
          <SignInNote />
        </div>
      </div>
    </Localized>
  );
}

/** Three steps from this page to a deck that is learnt, true to how Lymi schedules. */
export function DeckHowItWorks({ deck, locale }: DeckProps) {
  const { inOrder, steps } = sectionPath(deck);
  const first = steps[0]?.name ?? "";
  const items = [
    {
      key: "add",
      title: <Trans>Add the deck</Trans>,
      body: <Trans>Sign in with Google and it joins your Library. Free during the beta.</Trans>,
    },
    inOrder
      ? {
          key: "sections",
          title: <Trans>Learn one section at a time</Trans>,
          body: (
            <Trans>
              You start with <span lang={deck.meaningLanguage}>{first}</span>. The next section
              opens as you learn the one before.
            </Trans>
          ),
        }
      : {
          key: "new",
          title: <Trans>New cards come in gradually</Trans>,
          body: <Trans>Each review mixes a few new cards in with the ones you are learning.</Trans>,
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
      <section
        aria-labelledby="how-title"
        className="border-t border-edge px-5 py-14 @2xl:px-10 @4xl:py-20"
      >
        <div className="mx-auto max-w-[1040px]">
          <h2
            id="how-title"
            className="text-3xl font-medium tracking-[-0.03em] text-balance text-text"
          >
            <Trans>How it works</Trans>
          </h2>
          <ol className="mt-8 grid gap-6 @3xl:grid-cols-3 @3xl:gap-10">
            {items.map((item, index) => (
              <li key={item.key} className="grid content-start gap-2 border-t border-edge pt-5">
                <span className="text-md text-muted tabular-nums">{index + 1}</span>
                <h3 className="text-lg font-medium tracking-[-0.02em] text-text">{item.title}</h3>
                <p className="max-w-[40ch] text-md text-pretty text-text-2">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </Localized>
  );
}

function StepCards({ step, deck }: { step: SectionStep; deck: PublicDeckOut }) {
  return (
    <dl className="grid">
      {step.cards.map((card, cardIndex) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: terms can repeat across sections; order is fixed.
          key={cardIndex}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-x-5 border-t border-edge py-2.5"
        >
          <dt
            lang={deck.language ?? undefined}
            className="text-md font-medium break-words text-text"
          >
            {card.term}
          </dt>
          <dd lang={deck.meaningLanguage} className="text-md break-words text-text-2">
            {card.meaning}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const summaryClass =
  "flex cursor-pointer list-none items-center gap-4 rounded-md py-3 select-none [&::-webkit-details-marker]:hidden";

function Chevron() {
  return (
    <ChevronDown
      aria-hidden="true"
      strokeWidth={1.75}
      className="ms-auto size-5 shrink-0 text-muted transition-transform duration-200 ease-out group-open:rotate-180 motion-reduce:transition-none"
    />
  );
}

/**
 * The deck's structure: its sections as the path a learner walks, first open, the rest waiting.
 * Each step folds its cards away, so every card stays in the HTML without the page becoming a table.
 */
export function DeckSections({ deck, locale }: DeckProps) {
  return (
    <Localized locale={locale}>
      <DeckSectionsBody deck={deck} />
    </Localized>
  );
}

function DeckSectionsBody({ deck }: { deck: PublicDeckOut }) {
  const { inOrder, steps } = sectionPath(deck);
  const first = steps[0]?.name ?? "";
  const lastNamed = steps.findLastIndex((step) => step.position !== null);
  const cardCount = deck.cardCount;

  return (
    <section
      id="sections"
      aria-labelledby="sections-title"
      className="scroll-mt-6 border-t border-edge px-5 py-14 @2xl:px-10 @4xl:py-20"
    >
      <div className="mx-auto grid max-w-[1040px] gap-8 @4xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] @4xl:gap-20">
        <div className="@4xl:sticky @4xl:top-8 @4xl:self-start">
          <h2
            id="sections-title"
            className="text-3xl font-medium tracking-[-0.03em] text-balance text-text"
          >
            {inOrder ? <Trans>One section at a time</Trans> : <Trans>Every card in the deck</Trans>}
          </h2>
          {inOrder && (
            <p className="mt-4 max-w-[44ch] text-md text-pretty text-text-2">
              <Trans>
                You start with <span lang={deck.meaningLanguage}>{first}</span>. Once every card in
                a section has come up and you know 80% of them, the next one opens by itself.
              </Trans>
            </p>
          )}
          <p className="mt-3 text-md text-muted">
            {inOrder ? (
              <Trans>Open a section to see its cards.</Trans>
            ) : (
              <Trans>Open the list to see every card.</Trans>
            )}
          </p>
        </div>

        {inOrder ? (
          <ol className="grid">
            {steps.map((step, index) => {
              const start = index === 0;
              const position = step.position;
              const connected = index < lastNamed;
              return (
                <li key={`${step.position ?? "rest"}-${step.name ?? ""}`} className="relative">
                  {connected && (
                    <span
                      aria-hidden="true"
                      className="absolute start-5 top-14 -bottom-2 w-px -translate-x-1/2 bg-edge-2 rtl:translate-x-1/2"
                    />
                  )}
                  <details className="deck-step group">
                    <summary className={clsx(summaryClass, "min-h-[4.5rem]")}>
                      <span
                        aria-hidden="true"
                        className={clsx(
                          "relative grid size-10 shrink-0 place-items-center rounded-full text-md font-medium tabular-nums",
                          start ? "bg-good text-canvas" : "bg-plate text-text-2 edge",
                        )}
                      >
                        {step.position ?? "·"}
                      </span>
                      <span className="grid min-w-0 gap-0.5">
                        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                          {step.position !== null && (
                            <span className="sr-only">
                              <Trans>Section {position}:</Trans>
                            </span>
                          )}
                          <span
                            lang={step.name === null ? undefined : deck.meaningLanguage}
                            className="text-lg font-medium tracking-[-0.02em] break-words text-text"
                          >
                            {step.name ?? <Trans>Cards outside a section</Trans>}
                          </span>
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                          <span className="tabular-nums">
                            <Plural value={step.cards.length} one="# card" other="# cards" />
                          </span>
                          {start && (
                            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-good-soft px-2 text-sm font-medium text-good">
                              <MapPin aria-hidden="true" strokeWidth={2} className="size-3.5" />
                              <Trans>You start here</Trans>
                            </span>
                          )}
                          {!start && step.position !== null && (
                            <span className="inline-flex items-center gap-1">
                              <Lock aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
                              <Trans>Opens after the one before</Trans>
                            </span>
                          )}
                          {step.position === null && <Trans>In review from the start</Trans>}
                        </span>
                      </span>
                      <Chevron />
                    </summary>
                    <div className="deck-step-cards ps-14 pb-4">
                      <StepCards step={step} deck={deck} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        ) : (
          <details className="deck-step group rounded-lg border-y border-edge">
            <summary className={summaryClass}>
              <span className="text-lg font-medium tracking-[-0.02em] text-text">
                <Plural value={cardCount} one="The one card" other="All # cards" />
              </span>
              <Chevron />
            </summary>
            <div className="deck-step-cards pb-4">
              {steps.map((step) => (
                <StepCards key="all" step={step} deck={deck} />
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

/** Where the deck's words come from, and when it was published. */
export function DeckAbout({ deck, locale }: DeckProps) {
  return (
    <Localized locale={locale}>
      <DeckAboutBody deck={deck} />
    </Localized>
  );
}

function DeckAboutBody({ deck }: { deck: PublicDeckOut }) {
  const date = useDate();
  const rows: { key: string; label: ReactNode; value: ReactNode }[] = [
    { key: "published", label: <Trans>Published</Trans>, value: date(deck.publishedAt) },
    ...(deck.reviewedAt
      ? [{ key: "checked", label: <Trans>Last checked</Trans>, value: date(deck.reviewedAt) }]
      : []),
  ];
  return (
    <section
      aria-labelledby="about-title"
      className="border-t border-edge px-5 py-14 @2xl:px-10 @4xl:py-20"
    >
      <div className="mx-auto grid max-w-[1040px] gap-6 @4xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] @4xl:gap-20">
        <h2 id="about-title" className="text-xl font-medium tracking-[-0.02em] text-text">
          <Trans>About this deck</Trans>
        </h2>
        <dl className="grid gap-x-6 gap-y-4 @xl:grid-cols-2">
          {rows.map((row) => (
            <div key={row.key} className="grid gap-0.5">
              <dt className="text-sm text-muted">{row.label}</dt>
              <dd className="text-md text-text">{row.value}</dd>
            </div>
          ))}
          {deck.sources.length > 0 && (
            <div className="grid gap-0.5 @xl:col-span-2">
              <dt className="text-sm text-muted">
                <Trans>Sources</Trans>
              </dt>
              <dd>
                <ul className="grid gap-1 text-md text-text">
                  {deck.sources.map((source) => (
                    <li key={`${source.title}-${source.url ?? ""}`} lang={deck.meaningLanguage}>
                      {source.url ? (
                        <a
                          href={source.url}
                          rel="nofollow noopener noreferrer"
                          className="rounded-xs underline decoration-edge-2 underline-offset-4 transition-[text-decoration-color] duration-150 hoverable:hover:decoration-current"
                        >
                          {source.title}
                        </a>
                      ) : (
                        source.title
                      )}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}

/** The last word: add the deck. */
export function DeckClosing({ deck, locale }: DeckProps) {
  return (
    <Localized locale={locale}>
      <section className="px-5 pt-4 pb-20 @2xl:px-10 @4xl:pb-28">
        <div className="mx-auto grid max-w-[1040px] gap-8 rounded-2xl bg-plate-2 p-7 edge-inset @2xl:p-12 @4xl:grid-cols-[1fr_auto] @4xl:items-end @4xl:gap-16 @4xl:p-16">
          <div>
            <h2 className="max-w-[18ch] text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl">
              <Trans>Keep every card, not just the first few.</Trans>
            </h2>
            <p className="mt-5 max-w-[46ch] text-md text-pretty text-text-2">
              <Trans>
                Add the deck, and Lymi brings each card back right before you’d forget it.
              </Trans>
            </p>
          </div>
          <div className="grid gap-3 @4xl:justify-items-end">
            <a href={addUrl(deck.slug)} className={buttonClass("primary", "lg")}>
              <Trans>Add to Lymi</Trans>
            </a>
            <SignInNote />
          </div>
        </div>
      </section>
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
      <SiteFooter openAppUrl={productUrl()} paths={languagePaths} />
    </Localized>
  );
}
