import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Check } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { signUpUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { appear, EASE, usePlayback } from "./playback";

/** The class in every teachers page demo: six faces shown, twelve learners in all. */
export const CLASS_LEARNERS = 12;
const FACES = ["mari", "jonas", "aiko", "tom", "lea", "anna"];

/** Each card carries its own beat, so a card added here can never be left without one. */
const ADDED: { term: string; meaning: MessageDescriptor; at: number }[] = [
  { term: "kohtuma", meaning: msg`To meet`, at: 500 },
  { term: "broneerima", meaning: msg`To book; to reserve`, at: 1000 },
  { term: "ilm", meaning: msg`Weather`, at: 1500 },
];

const BEATS: Record<string, number> = {
  ...Object.fromEntries(ADDED.map((card) => [card.term, card.at])),
  sent: 2300,
  learners: 2700,
};

/** The owner adds today's cards to the class deck, and they reach everyone who joined. */
function ClassDeck() {
  const { t, i18n } = useLingui();
  const still = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const { at } = usePlayback(BEATS, inView, still);
  const move = { duration: still ? 0 : 0.5, ease: EASE };
  const learners = CLASS_LEARNERS;

  return (
    <div ref={ref} className="mx-auto flex w-full max-w-[460px] flex-col gap-3">
      <div
        role="img"
        aria-label={t`A class deck, Estonian A2 · Tuesdays, gets three new cards after today’s lesson: kohtuma, broneerima and ilm. They reach all ${learners} learners.`}
        className="rounded-2xl bg-plate p-5 edge @2xl:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg font-medium tracking-[-0.02em] text-text">
              <Trans>Estonian A2 · Tuesdays</Trans>
            </p>
            <p className="mt-0.5 text-sm text-muted tabular-nums">
              <Plural value={learners} one="# learner" other="# learners" />
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-plate-2 px-2.5 py-1 text-xs text-text-2">
            <Trans>You own this deck</Trans>
          </span>
        </div>

        <p className="mt-6 text-xs text-muted">
          <Trans>After today’s lesson</Trans>
        </p>
        <ul className="mt-2 flex flex-col">
          {ADDED.map((card) => (
            <motion.li
              key={card.term}
              className="flex items-center gap-3 border-b border-edge py-2.5 last:border-b-0"
              initial={false}
              animate={appear(at(card.term))}
              transition={move}
            >
              <div className="min-w-0 flex-1">
                <p lang="et" className="truncate text-md font-medium text-text">
                  {card.term}
                </p>
                <p className="truncate text-sm text-muted">{i18n._(card.meaning)}</p>
              </div>
              <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-plate-2 px-2.5 text-xs text-text-2">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-state-new" />
                <Trans>New</Trans>
              </span>
            </motion.li>
          ))}
        </ul>

        <motion.div
          className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-plate-2 py-2.5 ps-3.5 pe-2.5"
          initial={false}
          animate={appear(at("sent"))}
          transition={move}
        >
          <p className="flex items-center gap-2 text-sm text-text">
            <Check aria-hidden="true" className="size-4 text-good" />
            <Plural value={learners} one="Reached # learner" other="Reached all # learners" />
          </p>
          <div className="flex shrink-0 items-center">
            {FACES.map((learner, i) => (
              <motion.img
                key={learner}
                src={`/avatars/${learner}.svg`}
                alt=""
                width={28}
                height={28}
                className="-ms-2 size-7 rounded-full ring-2 ring-plate-2 first:ms-0"
                initial={false}
                animate={at("learners") ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
                transition={{ ...move, delay: still || !at("learners") ? 0 : i * 0.06 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function ClassHero() {
  return (
    <div className="mx-auto grid max-w-[1120px] items-center gap-14 px-5 pt-12 pb-20 @2xl:px-10 @4xl:min-h-[700px] @4xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)] @4xl:gap-16 @4xl:pt-14">
      <div className="min-w-0 max-w-[560px]">
        <h1 className="text-5xl font-medium tracking-[-0.038em] text-balance text-text @4xl:text-[4.25rem] @4xl:leading-[1.02]">
          <Trans>One deck for your whole class.</Trans>
        </h1>
        <p className="mt-6 max-w-[42ch] text-lg text-pretty text-text-2 @2xl:text-xl">
          <Trans>
            Build the course in sections, share one link, and add what you taught after every
            lesson. Each learner reviews on their own schedule.
          </Trans>
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <a href={signUpUrl()} className={buttonClass("primary", "lg")}>
            <Trans>Get started</Trans>
          </a>
          <a href="#course" className={buttonClass("ghost", "lg")}>
            <Trans>How sections work</Trans>
          </a>
        </div>
      </div>

      <ClassDeck />
    </div>
  );
}
