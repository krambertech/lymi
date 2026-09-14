import { Trans } from "@lingui/react/macro";
import { Check } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useRef } from "react";
import { Lantern } from "../Lantern";
import { appear, EASE, usePlayback } from "./playback";
import { ReplayButton } from "./ReplayButton";

const BEATS = { ask: 200, read: 900, question: 1900, answer: 3400, correction: 4900 };

/** A word from the learner's deck, marked the way the cards mark AI text. */
function Deck({ children }: { children: ReactNode }) {
  return <mark className="rounded-xs bg-amber-soft px-0.5 text-inherit">{children}</mark>;
}

/** The assistant reads the German deck, then holds a short conversation built on its words. */
export function PracticeChat() {
  const still = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const { at, done, replay } = usePlayback(BEATS, inView, still);
  const move = { duration: still ? 0 : 0.5, ease: EASE };
  const you = "self-end max-w-[85%] bg-text px-3.5 py-2 text-md text-canvas";
  const them = "self-start max-w-[88%] bg-plate-2 px-3.5 py-2 text-md text-text";

  return (
    <div ref={ref} className="mx-auto flex w-full max-w-[460px] flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-2xl bg-plate p-4 edge @2xl:p-5">
        <motion.p
          className={you}
          style={{ borderRadius: 16 }}
          initial={false}
          animate={appear(at("ask"))}
          transition={move}
        >
          <Trans>Let’s practise. Use the German words from my deck.</Trans>
        </motion.p>

        <motion.p
          className="flex h-8 items-center gap-2 self-start rounded-full bg-plate-2 ps-1 pe-3 text-sm text-text-2"
          initial={false}
          animate={appear(at("read"))}
          transition={move}
        >
          <span className="grid size-6 place-items-center rounded-full bg-plate">
            <Lantern className="size-4" />
          </span>
          <Trans>Read your German deck</Trans>
          <Check aria-hidden="true" className="size-4 text-good" />
        </motion.p>

        <motion.p
          lang="de"
          className={them}
          style={{ borderRadius: 16 }}
          initial={false}
          animate={appear(at("question"))}
          transition={move}
        >
          Gut! Wann hast du heute <Deck>Feierabend</Deck>?
        </motion.p>

        <motion.p
          lang="de"
          className={you}
          style={{ borderRadius: 16 }}
          initial={false}
          animate={appear(at("answer"))}
          transition={move}
        >
          Um sechs. Dann ich höre auf.
        </motion.p>

        <motion.div
          className={them}
          style={{ borderRadius: 16 }}
          initial={false}
          animate={appear(at("correction"))}
          transition={move}
        >
          <p>
            <Trans>
              Almost! It’s{" "}
              <span lang="de" className="font-medium">
                „Dann <Deck>höre</Deck> ich <Deck>auf</Deck>“
              </span>
              : after “dann”, the verb comes second.
            </Trans>
          </p>
          <p lang="de" className="mt-1.5">
            Und was machst du nach dem <Deck>Feierabend</Deck>?
          </p>
        </motion.div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-muted">
          <span aria-hidden="true" className="h-3 w-4 rounded-xs bg-amber-soft" />
          <Trans>Words from your deck</Trans>
        </p>
        <ReplayButton shown={done && !still} onReplay={replay} />
      </div>
    </div>
  );
}
