import type { MessageDescriptor } from "@lingui/core";
import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import type { Locale } from "../../lib/routes";
import type { EditionWord } from "./language-decks";
import { SpokenWords, useClipPlayer } from "./SpokenWords";

/** One gender's nouns, under the article that marks it. */
export interface GenderGroup {
  /** The article, as the language writes it: der, el. */
  article: string;
  name: MessageDescriptor;
  words: readonly EditionWord[];
}

interface Props {
  groups: readonly GenderGroup[];
  locale: Locale;
  /** The language of the nouns. */
  lang: string;
  /** The folder under `/audio/` holding each noun's clip, named by its id. */
  folder: string;
}

/** Nouns sorted by their article, each with its meaning in this edition and its clip a tap away. */
export function GenderTiles({ groups, locale, lang, folder }: Props) {
  const { i18n } = useLingui();
  // One player for every group, so a second tap stops the first clip.
  const player = useClipPlayer(folder);
  return (
    <div
      className={clsx(
        "mt-12 grid gap-4 @4xl:mt-16",
        groups.length > 2 ? "@3xl:grid-cols-3" : "@2xl:grid-cols-2",
      )}
    >
      {groups.map((group) => (
        <section
          key={group.article}
          aria-label={`${group.article}, ${i18n._(group.name)}`}
          className="rounded-xl bg-plate p-5 edge @2xl:p-6"
        >
          <p className="flex items-baseline gap-3">
            <span lang={lang} className="text-4xl font-medium tracking-[-0.03em] text-amber-mark">
              {group.article}
            </span>
            <span className="text-sm text-ink-muted">{i18n._(group.name)}</span>
          </p>
          <div className="mt-4">
            <SpokenWords words={group.words} locale={locale} lang={lang} player={player} />
          </div>
        </section>
      ))}
    </div>
  );
}
