import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Tile } from "./JapaneseBento";
import { Pinyin } from "./Pinyin";
import { useStill } from "./playback";

/** The same word in a simplified deck and a traditional one, each with its own voice. */
function Scripts() {
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.6 });
  const [traditional, setTraditional] = useState(false);

  useEffect(() => {
    if (still || !inView) return;
    const timer = window.setInterval(() => setTraditional((t) => !t), 2600);
    return () => window.clearInterval(timer);
  }, [still, inView]);

  const decks = [
    {
      lang: "zh-Hans",
      term: "学习",
      name: <Trans>Simplified deck</Trans>,
      voice: <Trans>Mainland voice</Trans>,
    },
    {
      lang: "zh-Hant",
      term: "學習",
      name: <Trans>Traditional deck</Trans>,
      voice: <Trans>Taiwan voice</Trans>,
    },
  ];
  return (
    <div ref={root} className="grid grid-cols-2 gap-2">
      {decks.map((deck, i) => (
        <div
          key={deck.lang}
          className={clsx(
            "grid justify-items-start gap-1 rounded-md bg-plate px-3.5 pt-2.5 pb-3 edge transition-opacity duration-500",
            traditional === (i === 0) && "opacity-55",
          )}
        >
          <span className="text-xs text-ink-muted">{deck.name}</span>
          <span lang={deck.lang} className="text-[44px] leading-[1.15] font-medium text-ink">
            {deck.term}
          </span>
          <span className="text-xs text-amber-text">{deck.voice}</span>
        </div>
      ))}
    </div>
  );
}

/** Pinyin typed with tone numbers, turning into tone marks. */
function ToneMarks() {
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.6 });
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    if (still) return setMarked(true);
    if (!inView) return;
    const timer = window.setInterval(() => setMarked((m) => !m), 2200);
    return () => window.clearInterval(timer);
  }, [still, inView]);

  return (
    <div ref={root} aria-hidden="true" className="rounded-md bg-plate edge">
      <p className="flex items-baseline justify-between gap-3 border-b border-edge px-3.5 py-2.5">
        <span className="text-xs text-ink-muted">
          <Trans>Pinyin</Trans>
        </span>
        <span className="relative h-7 min-w-[7ch] text-end text-xl text-ink">
          <span
            className={clsx(
              "absolute inset-0 transition-[opacity,filter] duration-300",
              marked && "opacity-0 blur-sm",
            )}
          >
            xue2xi2
          </span>
          <span
            className={clsx(
              "absolute inset-0 text-amber-text transition-[opacity,filter] duration-300",
              !marked && "opacity-0 blur-sm",
            )}
          >
            xuéxí
          </span>
        </span>
      </p>
      <p className="flex items-center justify-between px-3.5 py-2.5">
        <span lang="zh-Hans" className="text-[30px] leading-[1.7] font-medium text-ink">
          <Pinyin term="学习" pinyin="xué xí" />
        </span>
        <span className="text-sm text-ink-secondary">
          <Trans>To study</Trans>
        </span>
      </p>
    </div>
  );
}

/** Chinese learners' own needs, each in a line and a small picture. */
export function ChineseBento() {
  return (
    <div className="mt-12 grid gap-2.5 @3xl:grid-cols-2 @4xl:mt-16">
      <Tile
        title={<Trans>Simplified or traditional</Trans>}
        body={
          <Trans>
            Each deck is one or the other. Lymi never converts between them, and traditional decks
            use a Taiwan voice.
          </Trans>
        }
      >
        <Scripts />
      </Tile>
      <Tile
        title={<Trans>Type tones as numbers</Trans>}
        body={
          <Trans>
            Type xue2xi2 and the card shows xuéxí. The same goes for imports and your assistant.
          </Trans>
        }
      >
        <ToneMarks />
      </Tile>
    </div>
  );
}
