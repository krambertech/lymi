import { useLingui } from "@lingui/react/macro";
import { type KnownReadings, stripReadings, textDirection } from "@lymi/core";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { ExampleText } from "./term-text";

interface Props {
  example: string;
  language?: string | null | undefined;
  known?: KnownReadings | undefined;
  /** Draws the sentence as written, with no readings over it, for a learner who shows pronunciation separately. */
  plain?: boolean | undefined;
  translation?: string | null | undefined;
  /** Follows the translation, such as the AI's badge when the AI wrote only the translation. */
  badge?: ReactNode;
  /** The example's play control: at the block's far edge, level with its first line. */
  speaker?: ReactNode;
  /** Puts the speaker after the example's last word instead, as review does. */
  speakerAfterLastWord?: boolean | undefined;
  /** Plays the example when the sentence itself is clicked. */
  onPlay?: (() => void) | undefined;
  className?: string | undefined;
}

/**
 * An example over its translation in `muted`, with its speaker at the far edge or after its last
 * word. Either way the speaker hangs from the baseline it shares with the first or last line, so it
 * centres on the letters whatever readings sit over them.
 */
export function ExampleLines({
  example,
  language,
  known,
  plain,
  translation,
  badge,
  speaker,
  speakerAfterLastWord,
  onPlay,
  className,
}: Props) {
  const { i18n } = useLingui();
  const lang = language ?? undefined;
  const inline = speakerAfterLastWord && speaker;
  const lines = (
    <div className="grid min-w-0 gap-0.5">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the sentence is only a wider pointer target; its speaker is the keyboard's control */}
      <p
        lang={lang}
        dir={textDirection(language)}
        className={clsx(className, onPlay && "cursor-pointer")}
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
        {inline}
      </p>
      {translation && (
        // In the meaning language, like the meaning, so it takes its language and direction from it.
        <p lang={i18n.locale} dir="auto" className={className}>
          <span className="text-ink-muted">{translation}</span>
          {badge && <span className="ms-1.5 inline-flex align-[0.0625em]">{badge}</span>}
        </p>
      )}
    </div>
  );
  if (!speaker || inline) return lines;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline">
      {lines}
      <span className={className}>{speaker}</span>
    </div>
  );
}
