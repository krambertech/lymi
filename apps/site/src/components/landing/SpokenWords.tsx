import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../../lib/routes";
import type { EditionWord } from "./language-decks";

/**
 * One clip at a time from `/audio/<folder>/<id>.mp3`, and which one is playing. Lists that sit
 * side by side share one, so a second tap stops the first clip.
 */
export function useClipPlayer(folder: string) {
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
  return { play, playing };
}

interface Props {
  words: readonly EditionWord[];
  locale: Locale;
  /** The language of the words. */
  lang: string;
  /** The player from `useClipPlayer`, shared by every list on the stage. */
  player: ReturnType<typeof useClipPlayer>;
}

/** Words as a deck lists them, each with its meaning in this edition and its clip a tap away. */
export function SpokenWords({ words, locale, lang, player }: Props) {
  const { t } = useLingui();
  const { play, playing } = player;
  return (
    <ul className="flex flex-col">
      {words.map((w) => (
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
  );
}
