import { Plural, Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { Locale } from "../../lib/routes";
import { addDeckUrl, type EditionWord } from "./language-decks";
import { SpokenWords } from "./SpokenWords";

interface Props {
  deck: PublicDeckSummary;
  words: readonly EditionWord[];
  locale: Locale;
  /** The language of the deck's terms. */
  lang: string;
  /** The folder under `/audio/` holding each word's clip, named by its id. */
  folder: string;
}

/** A deck as its page lists it: a few of its words or phrases, each in the native voice. */
export function DeckWords({ deck, words, locale, lang, folder }: Props) {
  return (
    <div className="mx-auto max-w-[480px] rounded-xl bg-plate p-5 edge @2xl:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-medium tracking-[-0.02em] text-ink">{deck.name}</p>
          <p className="mt-0.5 text-sm text-ink-muted tabular-nums">
            <Plural value={deck.cardCount} one="# card" other="# cards" />
          </p>
        </div>
        <a
          href={addDeckUrl(deck)}
          className="inline-flex h-8 shrink-0 items-center rounded-full bg-plate-nested px-3 text-sm font-medium text-ink edge hoverable:hover:bg-plate-hover"
        >
          <Trans>Add deck</Trans>
        </a>
      </div>
      <div className="mt-4">
        <SpokenWords words={words} locale={locale} lang={lang} folder={folder} />
      </div>
    </div>
  );
}
