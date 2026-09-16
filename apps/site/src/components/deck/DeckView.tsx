import { I18nProvider } from "@lingui/react";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { PublicDeckOut } from "@lymi/core/catalog";
import type { CSSProperties, ReactNode } from "react";
import { type DeckCard, languageName } from "../../lib/deck-page";
import { pageI18n } from "../../lib/i18n";
import { productUrl } from "../../lib/origins";
import { type Locale, localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { AppTile } from "../Logo";
import { SiteFooter } from "../landing/SiteFooter";

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

/** Who made the deck. A catalog card can show the same line. */
export function DeckByline({ deck }: { deck: PublicDeckOut }) {
  const { i18n } = useLingui();
  const date = useDate();
  const publisher = deck.publisher;
  const checked = deck.reviewedAt ? date(deck.reviewedAt) : null;
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-md">
      {publisher.trim().toLowerCase() === "lymi" ? (
        <AppTile size={28} />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full bg-text text-sm font-semibold text-canvas"
        >
          {publisher.trim().charAt(0).toLocaleUpperCase(i18n.locale)}
        </span>
      )}
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
  const level = deck.level;
  const items = [
    language,
    level && <Trans key="level">Level {level}</Trans>,
    <Plural key="cards" value={deck.cardCount} one="# card" other="# cards" />,
    meaningLanguage && <Trans key="meanings">Meanings in {meaningLanguage}</Trans>,
  ].filter(Boolean);
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-md text-muted">
      {items.map((item, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that never reorders.
        <li key={index}>{item}</li>
      ))}
    </ul>
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
        // A long word would break mid-letter at the full size, so the card steps down first.
        const longest = Math.max(...card.term.split(/\s+/).map((word) => word.length));
        const style = {
          "--term": longest >= 13 ? 0.105 : longest >= 10 ? 0.12 : 0.14,
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
                {card.section && (
                  <p lang={deck.meaningLanguage} className="deck-spread-section">
                    {card.section}
                  </p>
                )}
                <p lang={deck.language ?? undefined} className="deck-spread-term">
                  {card.term}
                </p>
                <p lang={deck.meaningLanguage} className="deck-spread-meaning">
                  {card.meaning}
                </p>
              </article>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The name, who made it, what it is, the way to add it, and a few of its cards. */
export function DeckHero({ deck, locale, spread }: DeckProps & { spread: DeckCard[] }) {
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
        <div className="mt-4">
          <DeckFacts deck={deck} />
        </div>
        <p className="mx-auto mt-6 max-w-[42ch] text-md text-pretty text-text-2">
          <Trans>
            Lymi is a vocabulary app: it brings each card back right before you’d forget it.
          </Trans>
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <a href={addUrl(deck.slug)} className={buttonClass("primary", "lg")}>
            <Trans>Add to Lymi</Trans>
          </a>
          <a href="#how" className={buttonClass("ghost", "lg")}>
            <Trans>Try a few cards</Trans>
          </a>
        </div>
        {spread.length > 0 && <DeckSpread deck={deck} cards={spread} />}
      </div>
    </Localized>
  );
}

/** Three steps from this page to a deck that is learnt, beside a stack of its cards to turn over. */
export function DeckHowItWorks({ locale }: LocaleProps) {
  const items = [
    {
      key: "add",
      title: <Trans>Add the deck</Trans>,
      body: <Trans>Sign in with Google and it joins your Library. Free during the beta.</Trans>,
    },
    {
      key: "recall",
      title: <Trans>Recall, then turn it over</Trans>,
      body: (
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
