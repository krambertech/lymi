import { clsx } from "clsx";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Lantern } from "../Lantern";
import { appear, EASE, usePlayback } from "./playback";
import { useShowcaseStage } from "./Showcase";

export interface Turn {
  /** Who says it: the assistant, or the learner. */
  who: "assistant" | "you";
  text: string;
  /** The language it is spoken in, when it is not the page's. */
  lang?: string;
}

interface Props {
  /** What the assistant took from Lymi, such as "10 words from Italian A2". */
  source: ReactNode;
  /** The conversation, the learner's request first. */
  turns: readonly [Turn, ...Turn[]];
  /** The learner's own words from Lymi, marked wherever they are said. */
  words?: readonly string[];
}

const WAVE = [0.45, 0.7, 1, 0.8, 0.55, 0.9, 0.65, 0.4, 0.75];

/**
 * The voice itself, above the transcript: bars that rise and fall while someone is talking, darker
 * for the assistant than for the learner, and holding still once the conversation ends.
 */
function Wave({ talking, who }: { talking: boolean; who: Turn["who"] | undefined }) {
  return (
    <span
      aria-hidden="true"
      data-speaking={talking || undefined}
      className="mb-5 flex h-14 items-center gap-1.5"
    >
      {WAVE.map((height, i) => (
        <span
          // oxlint-disable-next-line react/no-array-index-key -- the bars never move or change.
          key={i}
          className={clsx(
            "voice-wave w-1.5 rounded-full transition-colors duration-300",
            who === "you" ? "bg-ink-secondary" : "bg-ink",
          )}
          style={{ height: `${height * 100}%`, animationDelay: `${i * -0.19}s` }}
        />
      ))}
    </span>
  );
}

/** The learner asks, the assistant takes the cards from Lymi, then each turn, then quiet. */
const BEATS = { ask: 200, lymi: 1200, t1: 2100, t2: 3900, t3: 5600, t4: 7300, end: 8800 };
const TURN_BEATS = ["ask", "t1", "t2", "t3", "t4"] as const;

/** Each of the learner's words in a line, lifted off the stage, so you see where they come up. */
function marked(text: string, words: readonly string[]) {
  if (words.length === 0) return text;
  const escaped = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  return text.split(pattern).map((part, i) =>
    i % 2 === 1 ? (
      // oxlint-disable-next-line react/no-array-index-key -- the parts of one fixed line never reorder.
      <span key={i} className="-mx-[3px] rounded-md bg-plate px-[3px] py-px">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/**
 * A spoken practice conversation, straight on the Showcase stage: the assistant speaking, Lymi used
 * for the learner's words, and the transcript underneath, written in as it is said.
 */
export function VoiceScene({ source, turns, words = [] }: Props) {
  const { playing, still } = useShowcaseStage();
  const { at } = usePlayback(BEATS, playing, still);
  const said = turns.filter((_, i) => at(TURN_BEATS[i] ?? "t4"));
  const last = said.at(-1);
  const talking = !still && said.length > 0 && !at("end");
  const move = { duration: still ? 0 : 0.45, ease: EASE };

  return (
    <div className="flex w-full max-w-[400px] flex-col items-center">
      <Wave talking={talking} who={last?.who} />
      <motion.p
        className="flex h-7 items-center gap-1.5 rounded-full bg-plate ps-1 pe-2.5 text-xs text-ink-secondary"
        initial={false}
        animate={appear(at("lymi"))}
        transition={move}
      >
        <span className="grid size-5 place-items-center rounded-full bg-plate-nested">
          <Lantern className="size-3.5" />
        </span>
        {source}
        <Check aria-hidden="true" className="size-3.5 text-success" />
      </motion.p>

      <ol className="mt-6 flex min-h-[220px] w-full flex-col gap-3">
        {turns.map((turn, i) => {
          const shown = at(TURN_BEATS[i] ?? "t4");
          const current = turn === last;
          return (
            <motion.li
              key={turn.text}
              lang={turn.lang}
              initial={false}
              animate={appear(shown)}
              transition={move}
              className={clsx(
                "text-pretty transition-colors duration-500",
                "text-md",
                turn.who === "you" ? "max-w-[85%] self-end text-end" : "max-w-[92%] self-start",
                current ? "text-ink" : "text-ink-secondary",
                !shown && "hidden",
              )}
            >
              {marked(turn.text, words)}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
