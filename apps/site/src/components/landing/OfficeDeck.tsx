import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { clsx } from "clsx";
import { Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import type { Locale } from "../../lib/routes";
import { addDeckUrl } from "./language-decks";
import type { PolishWord } from "./polish";

function usePlayer() {
  const clip = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string>();
  const play = (id: string) => {
    clip.current?.pause();
    clip.current = new Audio(`/audio/polish/${id}.mp3`);
    setPlaying(id);
    clip.current.onended = () => setPlaying(undefined);
    void clip.current.play().catch(() => setPlaying(undefined));
  };
  return { play, playing };
}

interface Props {
  deck: PublicDeckSummary;
  words: readonly PolishWord[];
  locale: Locale;
}

/** The office deck as its page lists it: phrases to say at the window, each in the native voice. */
export function OfficeDeck({ deck, words, locale }: Props) {
  const { t } = useLingui();
  const { play, playing } = usePlayer();

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
      <ul className="mt-4 flex flex-col">
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
              <p lang="pl" className="text-md font-medium text-pretty text-ink">
                {w.term}
              </p>
              <p lang={locale} className="text-sm text-pretty text-ink-muted">
                {w.meaning[locale]}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
