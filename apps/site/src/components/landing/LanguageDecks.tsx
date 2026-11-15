import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { shelfPath } from "../../lib/explore";
import type { Locale } from "../../lib/routes";
import { trayHues } from "../../lib/tray";
import { DeckTile } from "../explore/DeckTile";
import { ArrowLink } from "./ArrowLink";
import { COLUMN, GUTTER, Section } from "./Section";

interface Props {
  decks: PublicDeckSummary[];
  locale: Locale;
  /** The language's shelf in Explore, as its path names it: `japanese`. */
  shelf: string;
  body: ReactNode;
  /** The link to the whole shelf. */
  all: ReactNode;
}

/** Every published deck in one language in one row, and the way to the rest of the shelf. */
export function LanguageDecks({ decks, locale, shelf, body, all }: Props) {
  const hues = trayHues(decks);

  return (
    <Section bleed>
      <div className={clsx(COLUMN, GUTTER)}>
        <Section.Header>
          <Section.Title>
            <Trans>Explore ready-made decks.</Trans>
          </Section.Title>
          <Section.Body>{body}</Section.Body>
          <Section.Action>
            <ArrowLink href={shelfPath({ kind: "languages", name: shelf }, locale)} size="md">
              {all}
            </ArrowLink>
          </Section.Action>
        </Section.Header>
      </div>

      <ul className="mx-auto mt-12 flex max-w-[1040px] snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-5 px-5 pb-4 @2xl:scroll-px-10 @2xl:px-10">
        {decks.map((deck, i) => (
          <li key={deck.slug} className="w-[220px] shrink-0 snap-start">
            <DeckTile deck={deck} hue={hues[i] ?? 0} locale={locale} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
