import { motion } from "motion/react";
import { useId } from "react";
import { useStill } from "./playback";

interface Props {
  /** The words to choose between, as they are written. */
  words: readonly string[];
  /** The language the words are in. */
  lang: string;
  /** The index of the word on show. */
  at: number;
  onPick: (index: number) => void;
}

/**
 * A row of words to switch a demo between. One highlight slides from word to word rather than
 * blinking between them; `aria-pressed` tells a screen reader which word is on show.
 */
export function WordPicker({ words, lang, at, onPick }: Props) {
  const still = useStill();
  // Two pickers on one page each move their own highlight.
  const highlight = useId();
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {words.map((word, i) => (
        <button
          key={word}
          type="button"
          lang={lang}
          aria-pressed={i === at}
          onClick={() => onPick(i)}
          className="relative h-9 rounded-full px-3.5 text-md text-ink-muted transition-colors duration-200 hoverable:hover:text-ink aria-pressed:text-ink"
        >
          {i === at && (
            <motion.span
              layoutId={highlight}
              transition={
                still ? { duration: 0 } : { type: "spring", duration: 0.45, bounce: 0.15 }
              }
              className="absolute inset-0 rounded-full bg-plate edge"
            />
          )}
          <span className="relative">{word}</span>
        </button>
      ))}
    </div>
  );
}
