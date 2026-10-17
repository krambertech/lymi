import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Volume2 } from "lucide-react";
import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../Button";
import { Furigana } from "./Furigana";
import { useStill } from "./playback";

type Stage = "new" | "learning" | "known" | "turned";

/** The card's life in order; the demo walks it on its own until the visitor takes over. */
const STAGES: Stage[] = ["new", "learning", "known", "turned"];
const STAGE_MS = 2600;

const DOT: Record<Exclude<Stage, "turned">, string> = {
  new: "bg-state-new",
  learning: "bg-state-learning",
  known: "bg-state-known",
};

/**
 * One Japanese card as review draws it: the reading sits over the kanji while the card is new or
 * learning, and once it is Known the reading waits for the turn, keeping its room so the word
 * stays put.
 */
export function ReadingDemo() {
  const { t } = useLingui();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.5 });
  const still = useStill();
  const [stage, setStage] = useState<Stage>("new");
  const [held, setHeld] = useState(false);
  const clip = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => clip.current?.pause(), []);

  useEffect(() => {
    if (still || held || !inView) return;
    const timer = window.setInterval(
      () => setStage((now) => STAGES[(STAGES.indexOf(now) + 1) % STAGES.length] as Stage),
      STAGE_MS,
    );
    return () => window.clearInterval(timer);
  }, [still, held, inView]);

  const choose = (next: Stage) => {
    setHeld(true);
    setStage(next);
  };
  const play = () => {
    clip.current?.pause();
    clip.current = new Audio("/audio/hand/hashi.mp3");
    clip.current.play().catch(() => {});
  };
  const turned = stage === "turned";
  const shown = turned ? "known" : stage;
  const label = { new: t`New`, learning: t`Learning`, known: t`Known` };

  return (
    <div ref={root} className="mx-auto grid w-full max-w-[360px] gap-4">
      <fieldset className="m-0 flex min-w-0 flex-wrap justify-center gap-1.5 border-0 p-0">
        <legend className="sr-only">{t`Show the card as`}</legend>
        {(["new", "learning", "known"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={shown === key}
            onClick={() => choose(key)}
            className={clsx(
              "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm transition-colors duration-200",
              shown === key
                ? "bg-text font-medium text-canvas"
                : "bg-plate text-text-2 edge hoverable:hover:bg-hover hoverable:hover:text-text",
            )}
          >
            <span aria-hidden="true" className={clsx("size-2 rounded-full", DOT[key])} />
            {label[key]}
          </button>
        ))}
      </fieldset>

      <div className="flex min-h-[290px] flex-col rounded-2xl bg-plate p-5 edge">
        <p className="text-xs font-medium tracking-[0.06em] text-muted uppercase">
          <span lang="ja">日本語</span> · <Trans>noun</Trans>
        </p>
        <div className="mt-6 flex items-end justify-between gap-3">
          <p lang="ja" className="text-5xl leading-[1.25] font-medium text-text">
            <Furigana term="箸" reading="はし" lang="ja" hidden={stage === "known"} />
          </p>
          <button
            type="button"
            aria-label={t`Play pronunciation`}
            onClick={play}
            className="relative mb-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-plate-2 text-text-2 edge transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97] hoverable:hover:bg-hover hoverable:hover:text-text before:absolute before:-inset-1.5 before:content-[''] [&_svg]:size-4"
          >
            <Volume2 aria-hidden="true" />
          </button>
        </div>
        <div className="mt-auto" aria-live={held ? "polite" : "off"}>
          {turned ? (
            <div className="border-t border-edge-2 pt-3.5">
              <p className="text-xl leading-[1.3] font-medium text-text">
                <Trans>Chopsticks</Trans>
              </p>
              <p className="mt-2 text-sm leading-[1.45] text-muted">
                <Trans>
                  Bridge, <span lang="ja">橋</span>, is read <span lang="ja">はし</span> too. Only
                  the pitch tells them apart.
                </Trans>
              </p>
            </div>
          ) : (
            <p className="text-sm text-pretty text-muted">
              {stage === "new" ? (
                <Trans>New: the reading sits over the kanji.</Trans>
              ) : stage === "learning" ? (
                <Trans>Learning: the reading stays while the word settles.</Trans>
              ) : (
                <Trans>Known: read it yourself. The reading shows when you turn it over.</Trans>
              )}
            </p>
          )}
        </div>
      </div>

      <Button
        variant="secondary"
        onClick={() => choose(turned ? "known" : "turned")}
        className="justify-self-center"
      >
        {turned ? <Trans>Turn it back</Trans> : <Trans>Turn it over</Trans>}
      </Button>
    </div>
  );
}
