import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, Search } from "lucide-react";
import { useInView } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useStill } from "./playback";

export function Tile({
  title,
  body,
  children,
}: {
  title: ReactNode;
  body: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-plate-2 p-6 edge-inset @2xl:p-7">
      <h3 className="text-xl font-medium tracking-[-0.02em] text-text">{title}</h3>
      <p className="max-w-[40ch] text-md text-pretty text-text-2">{body}</p>
      <div className="mt-auto pt-5">{children}</div>
    </div>
  );
}

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
                "kanji-zh absolute text-muted transition-opacity duration-300",
                !chinese && "opacity-0",
              )}
            >
              {kanji}
            </span>
            <span
              lang="ja"
              className={clsx(
                "absolute text-text transition-opacity duration-300",
                chinese && "opacity-0",
              )}
            >
              {kanji}
            </span>
          </span>
          <span className={clsx("text-xs", chinese ? "text-muted" : "text-amber-text")}>
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
    <div className="mt-12 grid gap-2.5 @3xl:grid-cols-2 @4xl:mt-16">
      <Tile
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
            <Search className="size-4 text-muted" />
            <span lang="ja" className="text-text">
              デンシャ
            </span>
          </p>
          <p className="flex items-baseline justify-between gap-3 px-3.5 py-3">
            <span lang="ja" className="text-xl font-medium text-text">
              電車
            </span>
            <span lang="ja" className="text-sm text-muted">
              でんしゃ
            </span>
          </p>
        </div>
      </Tile>

      <Tile
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
          className="rounded-md bg-plate px-4 py-3 text-2xl leading-[2.2] text-text edge"
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
        title={<Trans>Bring your Anki deck</Trans>}
        body={
          <Trans>
            Coming from a deck like Kaishi 1.5k? Word recordings stay on the cards, and pitch accent
            and sentence translations come along as notes.
          </Trans>
        }
      >
        <ul className="grid gap-1.5 text-md text-text">
          {[
            <Trans key="r">Word recordings</Trans>,
            <Trans key="p">Pitch accent</Trans>,
            <Trans key="f">Readings</Trans>,
          ].map((item) => (
            <li key={item.key} className="flex items-center gap-2.5">
              <span className="grid size-5 place-items-center rounded-full bg-good-soft text-good">
                <Check aria-hidden="true" className="size-3" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Tile>
    </div>
  );
}
