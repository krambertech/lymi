import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Braces, Check, LoaderCircle, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { buttonClass } from "../Button";
import { Lantern } from "../Lantern";
import { AssistantMark } from "./AssistantMarks";
import { useInView, usePlayback } from "./playback";

const EASE = [0.22, 1, 0.36, 1] as const;
const WORD_MS = 2200;

/** The headline's last word: every assistant by its mark, then anything built on the API. */
const WITH: { id: string; name: ReactNode; mark: ReactNode }[] = [
  { id: "claude", name: "Claude", mark: <AssistantMark name="Claude" /> },
  { id: "chatgpt", name: "ChatGPT", mark: <AssistantMark name="ChatGPT" /> },
  { id: "gemini", name: "Gemini", mark: <AssistantMark name="Gemini" /> },
  { id: "codex", name: "Codex", mark: <AssistantMark name="Codex" /> },
  {
    id: "anything",
    name: <Trans>anything</Trans>,
    mark: <Braces aria-hidden="true" strokeWidth={2.25} className="text-amber-text" />,
  },
];

function Headline() {
  const { t } = useLingui();
  const still = useReducedMotion();
  const [ref, inView] = useInView<HTMLHeadingElement>();
  const [index, setIndex] = useState(0);
  const current = WITH[index % WITH.length] as (typeof WITH)[number];

  useEffect(() => {
    if (still || !inView) return;
    const next = window.setInterval(() => setIndex((i) => i + 1), WORD_MS);
    return () => window.clearInterval(next);
  }, [still, inView]);

  return (
    <h1
      ref={ref}
      aria-label={t`Make cards with Claude, ChatGPT, Gemini, Codex or anything`}
      className="text-5xl font-medium tracking-[-0.038em] text-text @4xl:text-[4.25rem]"
    >
      <span aria-hidden="true" className="block leading-[1.05]">
        <Trans>Make cards with</Trans>
      </span>
      <span aria-hidden="true" className="relative block h-[1.2em]">
        <AnimatePresence initial={false}>
          <motion.span
            key={current.id}
            className="absolute inset-x-0 top-0 flex h-[1.2em] items-center gap-[0.2em] whitespace-nowrap"
            initial={{ opacity: 0, y: "0.5em", filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: "-0.5em", filter: "blur(8px)" }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <span className="grid size-[0.86em] shrink-0 place-items-center rounded-[0.22em] bg-plate edge [&_svg]:size-[0.54em]">
              {current.mark}
            </span>
            <span>{current.name}</span>
          </motion.span>
        </AnimatePresence>
      </span>
    </h1>
  );
}

interface Made {
  kind: MessageDescriptor;
  term: string;
  meaning: MessageDescriptor;
}

/** The notes in the photo and the cards they become. The same German cards turn over further down. */
const NOTES = ["das Mädchen", "aufhören", "Feierabend", "Schnapsidee"];
const MADE: Made[] = [
  { kind: msg`noun`, term: "das Mädchen", meaning: msg`The girl` },
  { kind: msg`verb`, term: "aufhören", meaning: msg`To stop` },
  { kind: msg`noun`, term: "Feierabend", meaning: msg`The evening after work` },
  { kind: msg`noun`, term: "Schnapsidee", meaning: msg`A bad idea that seemed good` },
];

/** When each beat of the conversation lands, in ms. It plays once; Play again replays it. */
const BEATS = { photo: 250, ask: 850, calling: 1700, called: 3100, reply: 3500, cards: 4000 };
const appear = (visible: boolean) => ({
  opacity: visible ? 1 : 0,
  y: visible ? 0 : 10,
  filter: visible ? "blur(0px)" : "blur(6px)",
});

/** A photo of lesson notes goes to an assistant, it uses Lymi, and the cards land. */
function Conversation() {
  const { t, i18n } = useLingui();
  const still = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>();
  const { at, done, replay } = usePlayback(BEATS, inView, still);
  const move = { duration: still ? 0 : 0.5, ease: EASE };

  return (
    <div ref={ref} className="mx-auto flex w-full max-w-[460px] flex-col gap-3">
      <div
        role="img"
        aria-label={t`A photo of German lesson notes goes to an assistant with “Make cards from this.” It uses Lymi and adds four cards: das Mädchen, aufhören, Feierabend and Schnapsidee.`}
        className="flex flex-col gap-3 rounded-2xl bg-plate p-4 edge @2xl:p-5"
      >
        <div className="flex flex-col items-end gap-2">
          <motion.div
            className="w-[150px] rotate-[2deg] rounded-md bg-canvas px-3.5 pt-2 pb-3 edge"
            initial={false}
            animate={appear(at("photo"))}
            transition={move}
          >
            <p className="text-2xs text-muted">Dienstag</p>
            <ul lang="de" className="notes-hand mt-0.5 text-lg leading-[1.1] text-text-2">
              {NOTES.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </motion.div>
          <motion.p
            className="bg-text px-3.5 py-2 text-md text-canvas"
            style={{ borderRadius: 16 }}
            initial={false}
            animate={appear(at("ask"))}
            transition={move}
          >
            <Trans>Make cards from this.</Trans>
          </motion.p>
        </div>

        <motion.p
          className="flex h-8 items-center gap-2 self-start rounded-full bg-plate-2 ps-1 pe-3 text-sm text-text-2"
          initial={false}
          animate={appear(at("calling"))}
          transition={move}
        >
          <span className="grid size-6 place-items-center rounded-full bg-plate">
            <Lantern className="size-4" />
          </span>
          {at("called") ? (
            <>
              <Trans>Used Lymi</Trans>
              <Check aria-hidden="true" className="size-4 text-good" />
            </>
          ) : (
            <>
              <Trans>Using Lymi</Trans>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-muted" />
            </>
          )}
        </motion.p>

        <motion.p
          className="text-md text-text"
          initial={false}
          animate={appear(at("reply"))}
          transition={move}
        >
          <Trans>Added 4 cards to your German deck.</Trans>
        </motion.p>

        <ul className="grid grid-cols-2 gap-2">
          {MADE.map((card, i) => (
            <motion.li
              key={card.term}
              className="min-w-0 rounded-lg bg-canvas px-3 pt-2 pb-2.5 edge"
              initial={false}
              animate={
                at("cards")
                  ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
                  : { opacity: 0, y: 14, scale: 0.96, filter: "blur(6px)" }
              }
              transition={{ ...move, delay: still || !at("cards") ? 0 : i * 0.12 }}
            >
              <p className="text-2xs text-muted">Deutsch · {i18n._(card.kind)}</p>
              <p
                lang="de"
                className="mt-0.5 truncate text-md font-medium tracking-[-0.015em] text-text"
              >
                {card.term}
              </p>
              <p className="truncate text-xs text-text-2">{i18n._(card.meaning)}</p>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Held in place while it plays, so the button appearing never moves the page. */}
      <button
        type="button"
        onClick={replay}
        aria-hidden={!done || !!still}
        tabIndex={done && !still ? 0 : -1}
        className={buttonClass(
          "ghost",
          "sm",
          `self-end transition-opacity duration-300 ${done && !still ? "opacity-100" : "pointer-events-none opacity-0"}`,
        )}
      >
        <RotateCcw aria-hidden="true" />
        <Trans>Play again</Trans>
      </button>
    </div>
  );
}

export function AssistantHero() {
  return (
    <div className="mx-auto grid max-w-[1120px] items-center gap-14 px-5 pt-12 pb-20 @2xl:px-10 @4xl:min-h-[700px] @4xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)] @4xl:gap-16 @4xl:pt-14">
      <div className="min-w-0 max-w-[560px]">
        <Headline />
        <p className="mt-6 max-w-[40ch] text-lg text-pretty text-text-2 @2xl:text-xl">
          <Trans>
            Send your assistant a photo of your notes. It adds the cards to Lymi, and Lymi brings
            each one back right before you’d forget.
          </Trans>
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <a href="#join" className={buttonClass("primary", "lg")}>
            <Trans>Request access</Trans>
          </a>
          <a href="#connect" className={buttonClass("ghost", "lg")}>
            <Trans>How to connect</Trans>
          </a>
        </div>
      </div>

      <Conversation />
    </div>
  );
}
