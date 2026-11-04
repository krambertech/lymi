import type { MessageDescriptor } from "@lingui/core";
import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../../lib/routes";
import type { EditionWord } from "./language-decks";

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
  const { t, i18n } = useLingui();
  const clip = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string>();

  useEffect(() => () => clip.current?.pause(), []);

  const play = (id: string) => {
    clip.current?.pause();
    clip.current = new Audio(`/audio/${folder}/${id}.mp3`);
    setPlaying(id);
    clip.current.onended = () => setPlaying(undefined);
    void clip.current.play().catch(() => setPlaying(undefined));
  };

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
          <ul className="mt-4 flex flex-col">
            {group.words.map((w) => (
              <li key={w.id} className="flex items-center gap-3 border-t border-edge py-2.5">
                <button
                  type="button"
                  onClick={() => play(w.id)}
                  aria-label={t`Hear ${w.term}`}
                  className={clsx(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-full edge hoverable:hover:bg-plate-hover",
                    playing === w.id ? "text-amber-text" : "text-ink-secondary",
                  )}
                >
                  <Volume2 aria-hidden="true" className="size-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p lang={lang} className="text-md font-medium text-pretty text-ink">
                    {w.term}
                  </p>
                  <p lang={locale} className="text-sm text-pretty text-ink-muted">
                    {w.meaning[locale]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
