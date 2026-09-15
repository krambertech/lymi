import { I18nProvider } from "@lingui/react";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { PublicDeckOut } from "@lymi/core/catalog";
import type { ReactNode } from "react";
import { languageName } from "../../lib/deck-page";
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

function Facts({ deck }: { deck: PublicDeckOut }) {
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

/** The name, what the deck is, and the way to add it. Try it sits beside this on wide screens. */
export function DeckHeader({ deck, locale }: DeckProps) {
  return (
    <Localized locale={locale}>
      <div className="min-w-0 max-w-[560px]">
        <h1
          lang={deck.meaningLanguage}
          className="text-5xl font-medium tracking-[-0.038em] text-balance break-words text-text @4xl:text-[4rem] @4xl:leading-[1]"
        >
          {deck.name}
        </h1>
        <div className="mt-6">
          <Facts deck={deck} />
        </div>
        <p
          lang={deck.meaningLanguage}
          className="mt-5 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl"
        >
          {deck.summary}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-3">
          <a href={addUrl(deck.slug)} className={buttonClass("primary", "lg")}>
            <Trans>Add to Lymi</Trans>
          </a>
          <a href="#cards" className={buttonClass("ghost", "lg")}>
            <Trans>See every card</Trans>
          </a>
        </div>
        <div className="mt-3">
          <SignInNote />
        </div>
      </div>
    </Localized>
  );
}

const sectionAnchor = (index: number) => `section-${index + 1}`;

/** A section's own name is deck content; the group without one is named in the page language. */
function SectionName({
  name,
  lang,
  truncate,
}: {
  name: string | null;
  lang: string;
  truncate?: boolean;
}) {
  const className = truncate ? "min-w-0 truncate" : "min-w-0";
  if (name === null) {
    return (
      <span className={className}>
        <Trans>Other cards</Trans>
      </span>
    );
  }
  return (
    <span lang={lang} className={className}>
      {name}
    </span>
  );
}

/** The whole deck, in order, so a visitor and a search engine can see exactly what is in it. */
export function DeckContents({ deck, locale }: DeckProps) {
  const named = deck.sections.some((section) => section.name !== null);
  return (
    <Localized locale={locale}>
      <section
        id="cards"
        aria-labelledby="cards-title"
        className="scroll-mt-6 border-t border-edge px-5 py-16 @2xl:px-10 @4xl:py-24"
      >
        <div className="mx-auto grid max-w-[1040px] gap-10 @4xl:grid-cols-[220px_minmax(0,1fr)] @4xl:gap-20">
          <div className="@4xl:sticky @4xl:top-8 @4xl:self-start">
            <h2
              id="cards-title"
              className="text-3xl font-medium tracking-[-0.03em] text-balance text-text"
            >
              <Trans>Every card in the deck</Trans>
            </h2>
            {named && deck.sections.length > 1 && (
              <nav aria-labelledby="cards-title" className="mt-6 hidden @4xl:block">
                <ol className="grid gap-0.5 text-sm">
                  {deck.sections.map((section, index) => (
                    <li key={sectionAnchor(index)}>
                      <a
                        href={`#${sectionAnchor(index)}`}
                        className="-mx-2 flex items-baseline justify-between gap-3 rounded-sm px-2 py-1.5 text-text-2 transition-colors duration-150 hoverable:hover:bg-plate-2 hoverable:hover:text-text"
                      >
                        <SectionName name={section.name} lang={deck.meaningLanguage} truncate />
                        <span className="text-muted tabular-nums">{section.cards.length}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>

          <div className="grid gap-14">
            {deck.sections.map((section, index) => (
              <section
                key={sectionAnchor(index)}
                id={sectionAnchor(index)}
                aria-labelledby={named ? `${sectionAnchor(index)}-title` : "cards-title"}
                className="scroll-mt-6"
              >
                {named && (
                  <div className="flex items-baseline justify-between gap-4 border-b border-edge-2 pb-3">
                    <h3
                      id={`${sectionAnchor(index)}-title`}
                      className="flex min-w-0 items-baseline gap-3 text-xl font-medium tracking-[-0.02em] text-text"
                    >
                      {section.name !== null && (
                        <span className="text-md text-muted tabular-nums">{index + 1}</span>
                      )}
                      <SectionName name={section.name} lang={deck.meaningLanguage} />
                    </h3>
                    <span className="shrink-0 text-sm text-muted tabular-nums">
                      <Plural value={section.cards.length} one="# card" other="# cards" />
                    </span>
                  </div>
                )}
                <dl>
                  {section.cards.map((card, cardIndex) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: terms can repeat across sections; order is fixed.
                      key={cardIndex}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-x-6 border-b border-edge py-3.5"
                    >
                      <dt
                        lang={deck.language ?? undefined}
                        className="text-lg font-medium tracking-[-0.01em] break-words text-text"
                      >
                        {card.term}
                      </dt>
                      <dd lang={deck.meaningLanguage} className="text-md break-words text-text-2">
                        {card.meaning}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </section>
    </Localized>
  );
}

/** Who stands behind the deck and where its words come from. */
export function DeckAbout({ deck, locale }: DeckProps) {
  return (
    <Localized locale={locale}>
      <DeckAboutBody deck={deck} />
    </Localized>
  );
}

function DeckAboutBody({ deck }: { deck: PublicDeckOut }) {
  const { i18n } = useLingui();
  const date = useDate();
  const language = languageName(deck.language, i18n.locale, { label: true });
  const meaningLanguage = languageName(deck.meaningLanguage, i18n.locale, { label: true });
  const rows: { key: string; label: ReactNode; value: ReactNode }[] = [
    { key: "publisher", label: <Trans>Published by</Trans>, value: deck.publisher },
    ...(language ? [{ key: "language", label: <Trans>Terms in</Trans>, value: language }] : []),
    { key: "meanings", label: <Trans>Meanings in</Trans>, value: meaningLanguage },
    ...(deck.reviewedAt
      ? [{ key: "checked", label: <Trans>Last checked</Trans>, value: date(deck.reviewedAt) }]
      : []),
    { key: "published", label: <Trans>Published</Trans>, value: date(deck.publishedAt) },
  ];
  return (
    <section
      aria-labelledby="about-title"
      className="border-t border-edge px-5 py-16 @2xl:px-10 @4xl:py-24"
    >
      <div className="mx-auto grid max-w-[1040px] gap-8 @4xl:grid-cols-[220px_minmax(0,1fr)] @4xl:gap-20">
        <h2
          id="about-title"
          className="text-3xl font-medium tracking-[-0.03em] text-balance text-text"
        >
          <Trans>About this deck</Trans>
        </h2>
        <dl className="border-t border-edge">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid gap-1 border-b border-edge py-4 @xl:grid-cols-[180px_minmax(0,1fr)] @xl:gap-6"
            >
              <dt className="text-sm text-muted">{row.label}</dt>
              <dd className="text-md text-text">{row.value}</dd>
            </div>
          ))}
          {deck.sources.length > 0 && (
            <div className="grid gap-1 border-b border-edge py-4 @xl:grid-cols-[180px_minmax(0,1fr)] @xl:gap-6">
              <dt className="text-sm text-muted">
                <Trans>Sources</Trans>
              </dt>
              <dd>
                <ul className="grid gap-1.5 text-md text-text">
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
