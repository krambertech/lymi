import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Braces } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { AssistantMark } from "./AssistantMarks";
import { LearnerBubble, ToolCall, UsingLymi } from "./ChatParts";
import { FreeBadge } from "./FreeBadge";
import { HeroActions, HeroBadges, HeroFrame, HeroLede, heroTitleClass } from "./HeroParts";
import { appear, EASE, usePlayback } from "./playback";

const WORD_MS = 2200;

/** The headline's last word: every assistant by its mark, then anything built on the API. */
const WITH: { id: string; name: ReactNode; mark: ReactNode }[] = [
  { id: "claude", name: "Claude", mark: <AssistantMark name="Claude" /> },
  { id: "chatgpt", name: "ChatGPT", mark: <AssistantMark name="ChatGPT" /> },
  { id: "gemini", name: "Gemini", mark: <AssistantMark name="Gemini" /> },
  { id: "grok", name: "Grok", mark: <AssistantMark name="Grok" /> },
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
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref);
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
      aria-label={t`Make cards with Claude, ChatGPT, Gemini, Grok, Codex or anything`}
      className={heroTitleClass()}
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
  label: MessageDescriptor;
  term: string;
  meaning: MessageDescriptor;
}

/** The notes in the photo and the cards they become. The same German cards turn over further down. */
const NOTES = ["das Mädchen", "aufhören", "Feierabend", "Schnapsidee"];
const MADE: Made[] = [
  { label: msg`Deutsch · noun`, term: "das Mädchen", meaning: msg`The girl` },
  { label: msg`Deutsch · verb`, term: "aufhören", meaning: msg`To stop` },
  { label: msg`Deutsch · noun`, term: "Feierabend", meaning: msg`The evening after work` },
  { label: msg`Deutsch · noun`, term: "Schnapsidee", meaning: msg`A bad idea that seemed good` },
];

/** When each beat of the conversation lands, in ms. It plays once. */
const BEATS = { photo: 250, ask: 850, calling: 1700, called: 3100, reply: 3500, cards: 4000 };
/** A photo of lesson notes goes to an assistant, it uses Lymi, and the cards land. */
function Conversation() {
  const { t, i18n } = useLingui();
  const still = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const { at } = usePlayback(BEATS, inView, still);
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
            <p className="text-2xs text-ink-muted">Dienstag</p>
            <ul lang="de" className="notes-hand mt-0.5 text-lg leading-[1.1] text-ink-secondary">
              {NOTES.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </motion.div>
          <LearnerBubble initial={false} animate={appear(at("ask"))} transition={move}>
            <Trans>Make cards from this.</Trans>
          </LearnerBubble>
        </div>

        <ToolCall on="plate" initial={false} animate={appear(at("calling"))} transition={move}>
          <UsingLymi done={at("called")} />
        </ToolCall>

        <motion.p
          className="text-md text-ink"
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
              <p className="text-2xs text-ink-muted">{i18n._(card.label)}</p>
              <p
                lang="de"
                className="mt-0.5 truncate text-md font-medium tracking-[-0.015em] text-ink"
              >
                {card.term}
              </p>
              <p className="truncate text-xs text-ink-secondary">{i18n._(card.meaning)}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AssistantHero() {
  return (
    <HeroFrame
      copy={
        <>
          <HeroBadges>
            <FreeBadge />
          </HeroBadges>
          <Headline />
          <HeroLede>
            <Trans>
              Send your assistant a photo of your notes. It adds the cards to Lymi, and you review
              them there.
            </Trans>
          </HeroLede>
          <HeroActions secondary={{ href: "#connect", label: <Trans>How to connect</Trans> }} />
        </>
      }
      visual={<Conversation />}
    />
  );
}
