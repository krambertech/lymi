import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, Search } from "lucide-react";
import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { BENTO_HUES, LanguageBento, Tile } from "./LanguageBento";
import { useStill } from "./playback";

const SHAPES = ["骨", "直", "令"];

/** 骨, 直 and 令 turning between a Chinese font's forms and the Japanese ones. */
function Shapes() {
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.6 });
  const [chinese, setChinese] = useState(false);

  useEffect(() => {
    if (still || !inView) return;
    const timer = window.setInterval(() => setChinese((c) => !c), 2400);
    return () => window.clearInterval(timer);
  }, [still, inView]);

  return (
    <div ref={root} className="grid grid-cols-3 gap-2">
      {SHAPES.map((kanji) => (
        <div key={kanji} className="grid justify-items-center gap-1 rounded-md bg-plate py-2 edge">
          <span
            aria-hidden="true"
            className="relative grid h-[76px] w-full place-items-center text-[64px] leading-none"
          >
            <span
              lang="zh-Hans"
              className={clsx(
                "kanji-zh absolute text-ink-muted transition-opacity duration-300",
                !chinese && "opacity-0",
              )}
            >
              {kanji}
            </span>
            <span
              lang="ja"
              className={clsx(
                "absolute text-ink transition-opacity duration-300",
                chinese && "opacity-0",
              )}
            >
              {kanji}
            </span>
          </span>
          <span className={clsx("text-xs", chinese ? "text-ink-muted" : "text-amber-text")}>
            {chinese ? <Trans>Chinese font</Trans> : <Trans>Japanese</Trans>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Japanese learners' own needs, each in a line and a small picture. */
export function JapaneseBento() {
  return (
    <LanguageBento>
      <Tile
        hue={BENTO_HUES[0]}
        title={<Trans>Kanji in Japanese shapes</Trans>}
        body={
          <Trans>
            Some kanji look different in a Chinese font. Lymi shows your cards in Japanese forms,
            the way kanji look in Japanese books.
          </Trans>
        }
      >
        <Shapes />
      </Tile>

      <Tile
        hue={BENTO_HUES[1]}
        title={<Trans>Search by sound</Trans>}
        body={
          <Trans>
            Type <span lang="ja">でんしゃ</span> or <span lang="ja">デンシャ</span> and find{" "}
            <span lang="ja">電車</span>.
          </Trans>
        }
      >
        <div aria-hidden="true" className="rounded-md bg-plate edge">
          <p className="flex items-center gap-2.5 border-b border-edge px-3.5 py-3 text-md">
            <Search className="size-4 text-ink-muted" />
            <span lang="ja" className="text-ink">
              デンシャ
            </span>
          </p>
          <p className="flex items-baseline justify-between gap-3 px-3.5 py-3">
            <span lang="ja" className="text-xl font-medium text-ink">
              電車
            </span>
            <span lang="ja" className="text-sm text-ink-muted">
              でんしゃ
            </span>
          </p>
        </div>
      </Tile>

      <Tile
        hue={BENTO_HUES[2]}
        title={<Trans>Readings only where you need them</Trans>}
        body={
          <Trans>
            In example sentences, furigana stays over the words you’re still learning and leaves the
            ones you know.
          </Trans>
        }
      >
        <p
          aria-hidden="true"
          lang="ja"
          className="rounded-md bg-plate px-4 py-3 text-2xl leading-[2.2] text-ink edge"
        >
          <ruby>
            毎日<rt className="invisible text-[0.45em]">まいにち</rt>
          </ruby>
          、
          <ruby>
            電車<rt className="invisible text-[0.45em]">でんしゃ</rt>
          </ruby>
          で
          <ruby>
            図書館<rt className="text-[0.45em] text-amber-text">としょかん</rt>
          </ruby>
          に
          <ruby>
            通<rt className="text-[0.45em] text-amber-text">かよ</rt>
          </ruby>
          っています。
        </p>
      </Tile>

      <Tile
        hue={BENTO_HUES[3]}
        title={<Trans>Bring your Anki deck</Trans>}
        body={
          <Trans>
            Coming from a deck like Kaishi 1.5k? Word recordings and pitch accent stay on the cards,
            and sentence translations come along too.
          </Trans>
        }
      >
        <ul className="grid gap-1.5 text-md text-ink">
          {[
            <Trans key="r">Word and example recordings</Trans>,
            <Trans key="p">Pitch accent</Trans>,
            <Trans key="f">Readings</Trans>,
          ].map((item) => (
            <li key={item.key} className="flex items-center gap-2.5">
              <span className="grid size-5 place-items-center rounded-full bg-success-soft text-success">
                <Check aria-hidden="true" className="size-3" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Tile>
    </LanguageBento>
  );
}
