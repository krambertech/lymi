import { clsx } from "clsx";
import { motion } from "motion/react";
import { type ReactNode, useId } from "react";
import { useStill } from "./playback";

interface Props {
  /** What to choose between: words, or names such as "The lesson chat". */
  options: readonly ReactNode[];
  /** The index of the option on show. */
  at: number;
  onPick: (index: number) => void;
  /** Names the group for a screen reader, such as "What you send". */
  label: string;
  /** The language of the options, where they are words in the language being learned. */
  lang?: string | undefined;
  align?: "center" | "start" | undefined;
}

/**
 * A row of options that switches a demo. One plate slides from option to option rather than
 * blinking between them; `aria-pressed` tells a screen reader which one is on show.
 */
export function Picker({ options, at, onPick, label, lang, align = "center" }: Props) {
  const still = useStill();
  // Two pickers on one page each move their own plate.
  const plate = useId();
  return (
    <fieldset
      className={clsx(
        "m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0",
        align === "center" && "justify-center",
      )}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((option, i) => (
        <button
          // oxlint-disable-next-line react/no-array-index-key -- options keep their order, so the index is the identity
          key={i}
          type="button"
          lang={lang}
          aria-pressed={i === at}
          onClick={() => onPick(i)}
          className="relative h-9 rounded-full px-3.5 text-md text-ink-muted transition-colors duration-200 hoverable:hover:text-ink aria-pressed:text-ink"
        >
          {i === at && (
            <motion.span
              layoutId={plate}
              transition={
                still ? { duration: 0 } : { type: "spring", duration: 0.45, bounce: 0.15 }
              }
              className="absolute inset-0 rounded-full bg-plate edge"
            />
          )}
          <span className="relative">{option}</span>
        </button>
      ))}
    </fieldset>
  );
}
