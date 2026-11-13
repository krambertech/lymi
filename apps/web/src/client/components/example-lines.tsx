import { useLingui } from "@lingui/react/macro";
import { type KnownReadings, stripReadings, textDirection } from "@lymi/core";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Skeleton } from "./skeleton";
import { ExampleText } from "./term-text";

interface Props {
  example: string;
  language?: string | null | undefined;
  known?: KnownReadings | undefined;
  /** Draws the sentence as written, with no readings over it, for a learner who shows pronunciation separately. */
  plain?: boolean | undefined;
  translation?: string | null | undefined;
  /** Holds the translation's line while it is being written. */
  translating?: boolean | undefined;
  /** Follows the translation, such as the AI's badge when the AI wrote only the translation. */
  badge?: ReactNode;
  /** The example's play control, in the block's corner. */
  speaker?: ReactNode;
  /** Plays the example when the sentence itself is clicked. */
  onPlay?: (() => void) | undefined;
}

const LINE = "hyphenate whitespace-pre-line [overflow-wrap:anywhere]";

/** A card's example as one inset block: the sentence over its translation, the speaker in the corner. */
export function ExampleLines({
  example,
  language,
  known,
  plain,
  translation,
  translating,
  badge,
  speaker,
  onPlay,
}: Props) {
  const { i18n } = useLingui();
  const lang = language ?? undefined;
  return (
    <div className="relative grid gap-1 rounded-lg bg-plate-nested px-3.5 py-3">
      {/* The room is on this box, in the interface's direction, since the corner stays put under a right-to-left sentence. */}
      <div className={clsx(speaker && "pe-7")}>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: the sentence is only a wider pointer target; its speaker is the keyboard's control */}
        <p
          lang={lang}
          dir={textDirection(language)}
          className={clsx(LINE, "text-md leading-relaxed text-ink", onPlay && "cursor-pointer")}
          onClick={
            onPlay &&
            ((e) => {
              e.stopPropagation();
              // A double click selects a word, and a drag selects more; neither is a press.
              if (e.detail > 1 || window.getSelection()?.toString()) return;
              onPlay();
            })
          }
        >
          {plain ? (
            stripReadings(example, language)
          ) : (
            <ExampleText text={example} lang={lang} known={known} />
          )}
        </p>
      </div>
      {translation && (
        // In the meaning language, like the meaning, so it takes its language and direction from it.
        <p lang={i18n.locale} dir="auto" className={clsx(LINE, "text-base text-ink-muted")}>
          {translation}
          {badge && <span className="ms-1.5 inline-flex align-[0.0625em]">{badge}</span>}
        </p>
      )}
      {translating && !translation && (
        <div className="flex h-[1lh] items-center text-base" aria-hidden="true">
          <Skeleton className="h-3 w-2/3 rounded-sm" />
        </div>
      )}
      {speaker && (
        <span className="absolute end-1.5 top-3 flex h-[1lh] items-center text-md leading-relaxed">
          {speaker}
        </span>
      )}
    </div>
  );
}
