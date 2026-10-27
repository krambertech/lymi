import { useLingui } from "@lingui/react/macro";
import { type KnownReadings, textDirection } from "@lymi/core";
import { clsx } from "clsx";
import type { MouseEvent, ReactNode } from "react";
import { ExampleText } from "./term-text";

interface Props {
  example: string;
  language?: string | null | undefined;
  known?: KnownReadings | undefined;
  translation?: string | null | undefined;
  /** Follows the translation, such as the AI's badge when the AI wrote only the translation. */
  badge?: ReactNode;
  /** The example's play control: at the far edge, level with the example's first line. */
  speaker?: ReactNode;
  /** Review's block: the example and its translation on `plate-2`, the speaker in its top corner. */
  block?: boolean | undefined;
  /** Plays the example when the sentence, or in a block anywhere on the block, is clicked. */
  onPlay?: (() => void) | undefined;
  className?: string | undefined;
  /** The translation's classes in place of `className`. */
  translationClassName?: string | undefined;
}

/**
 * An example over its translation in `muted`, with its speaker at the far edge. The speaker hangs
 * from the baseline it shares with the first line, so it centres on the letters whatever readings
 * sit over them.
 */
export function ExampleLines({
  example,
  language,
  known,
  translation,
  badge,
  speaker,
  block,
  onPlay,
  className,
  translationClassName,
}: Props) {
  const { i18n } = useLingui();
  const lang = language ?? undefined;
  const play =
    onPlay &&
    ((e: MouseEvent) => {
      e.stopPropagation();
      // A double click selects a word, and a drag selects more; neither is a press.
      if (e.detail > 1 || window.getSelection()?.toString()) return;
      onPlay();
    });
  const lines = (
    <div className="grid min-w-0 gap-0.5">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the sentence is only a wider pointer target; its speaker is the keyboard's control */}
      <p
        lang={lang}
        dir={textDirection(language)}
        className={clsx(className, play && !block && "cursor-pointer")}
        onClick={block ? undefined : play}
      >
        <ExampleText text={example} lang={lang} known={known} />
      </p>
      {translation && (
        // In the meaning language, like the meaning, so it takes its language and direction from it.
        <p lang={i18n.locale} dir="auto" className={translationClassName ?? className}>
          <span className="text-muted">{translation}</span>
          {badge && <span className="ms-1.5 inline-flex align-[0.0625em]">{badge}</span>}
        </p>
      )}
    </div>
  );
  if (block) {
    return (
      // biome-ignore lint/a11y/useKeyWithClickEvents: the block is only a wider pointer target; its speaker is the keyboard's control
      // biome-ignore lint/a11y/noStaticElementInteractions: the block is only a wider pointer target; its speaker is the keyboard's control
      <div
        className={clsx(
          "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-1 rounded-lg bg-plate-2 py-3 ps-4",
          speaker ? "pe-2" : "pe-4",
          play && "cursor-pointer transition-colors duration-150 hoverable:hover:bg-hover",
        )}
        onClick={play}
      >
        {lines}
        {speaker && <span className={className}>{speaker}</span>}
      </div>
    );
  }
  if (!speaker) return lines;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline">
      {lines}
      <span className={className}>{speaker}</span>
    </div>
  );
}
