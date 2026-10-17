import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../Button";
import { Furigana } from "./Furigana";

type Stage = "new" | "known";

/**
 * One Japanese card as review draws it: the reading sits over the kanji while the card is new, and
 * once it is Known the reading waits for the turn, keeping its room so the word stays put.
 */
export function ReadingDemo() {
  const { t } = useLingui();
  const [stage, setStage] = useState<Stage>("new");
  const [turned, setTurned] = useState(false);
  const clip = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => clip.current?.pause(), []);

  const choose = (next: Stage) => {
    setStage(next);
    setTurned(false);
  };
  const play = () => {
    clip.current?.pause();
    clip.current = new Audio("/audio/hand/hashi.mp3");
    clip.current.play().catch(() => {});
  };
  const pill = (active: boolean) =>
    clsx(
      "h-9 rounded-full px-3.5 text-sm transition-colors duration-150",
      active
        ? "bg-text font-medium text-canvas"
        : "bg-plate text-text-2 edge hoverable:hover:bg-hover hoverable:hover:text-text",
    );

  return (
    <div className="mx-auto grid w-full max-w-[360px] gap-4">
      <fieldset className="m-0 flex min-w-0 flex-wrap justify-center gap-1.5 border-0 p-0">
        <legend className="sr-only">{t`Show the card as`}</legend>
        <button
          type="button"
          aria-pressed={stage === "new"}
          onClick={() => choose("new")}
          className={pill(stage === "new")}
        >
          <Trans>A new card</Trans>
        </button>
        <button
          type="button"
          aria-pressed={stage === "known"}
          onClick={() => choose("known")}
          className={pill(stage === "known")}
        >
          <Trans>A card you know</Trans>
        </button>
      </fieldset>

      <div className="flex min-h-[280px] flex-col rounded-2xl bg-plate p-5 edge">
        <p className="text-xs font-medium tracking-[0.06em] text-muted uppercase">
          <span lang="ja">日本語</span> · <Trans>noun</Trans>
        </p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <p lang="ja" className="text-[46px] leading-[1.1] font-medium text-text">
            <Furigana term="箸" reading="はし" lang="ja" hidden={stage === "known" && !turned} />
          </p>
          <button
            type="button"
            aria-label={t`Play pronunciation`}
            onClick={play}
            className="relative mb-1.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-plate-2 text-text-2 edge transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97] hoverable:hover:bg-hover hoverable:hover:text-text before:absolute before:-inset-1.5 before:content-[''] [&_svg]:size-4"
          >
            <Volume2 aria-hidden="true" />
          </button>
        </div>
        {turned ? (
          <div className="mt-auto border-t border-edge-2 pt-3.5">
            <p className="text-xl leading-[1.3] font-medium text-text">
              <Trans>Chopsticks</Trans>
            </p>
            <p className="mt-2 text-sm leading-[1.45] text-muted">
              <Trans>
                Bridge, <span lang="ja">橋</span>, is read <span lang="ja">はし</span> too. Only the
                pitch tells them apart.
              </Trans>
            </p>
          </div>
        ) : (
          <p className="mt-auto text-sm text-muted" aria-live="polite">
            {stage === "new" ? (
              <Trans>New: the reading sits over the kanji.</Trans>
            ) : (
              <Trans>Known: read it yourself. The reading shows when you turn it over.</Trans>
            )}
          </p>
        )}
      </div>

      <Button
        variant="secondary"
        onClick={() => setTurned((now) => !now)}
        className="justify-self-center"
      >
        {turned ? <Trans>Turn it back</Trans> : <Trans>Turn it over</Trans>}
      </Button>
    </div>
  );
}
