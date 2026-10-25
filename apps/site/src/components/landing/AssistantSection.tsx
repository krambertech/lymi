import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { motion, useInView } from "motion/react";
import { type CSSProperties, type ReactNode, useMemo, useRef, useState } from "react";
import { localizedPath } from "../../lib/routes";
import { Lantern } from "../Lantern";
import { ArrowLink } from "./ArrowLink";
import { Added, Attachment } from "./AssistantChat";
import { AssistantMark, type AssistantName } from "./AssistantMarks";
import { SectionTitle } from "./FeatureSection";
import { EASE, usePlayback, useStill } from "./playback";

interface Turn {
  from: "you" | "them";
  body: ReactNode;
}

interface Ask {
  id: string;
  label: ReactNode;
  assistant: AssistantName;
  turns: Turn[];
}

/** A word from the learner's own deck, marked as the cards mark it. */
function Word({ lang, children }: { lang: string; children: ReactNode }) {
  return (
    <mark lang={lang} className="rounded-xs bg-amber-soft px-0.5 text-inherit">
      {children}
    </mark>
  );
}

/** What Lymi's view inside the assistant shows when asked what's due. */
function DueView() {
  const decks = [
    { name: "Lisboa a dois", lang: "pt", due: 8 },
    { name: "Biology", lang: "en", due: 4 },
  ];
  return (
    <span className="mt-2.5 block rounded-lg bg-plate-2 p-3">
      <span className="flex items-center gap-2 text-xs text-muted">
        <Lantern className="size-4" />
        Lymi
      </span>
      {decks.map((deck) => (
        <span
          key={deck.name}
          className="mt-2 flex items-center justify-between gap-3 text-sm text-text"
        >
          <span lang={deck.lang}>{deck.name}</span>
          <span className="text-muted tabular-nums">
            <Plural value={deck.due} one="# due" other="# due" />
          </span>
        </span>
      ))}
      <span className="mt-3 flex h-8 items-center justify-center rounded-md bg-amber text-sm font-medium text-amber-ink key-light">
        <Trans>Review in Lymi</Trans>
      </span>
    </span>
  );
}

function useAsks(): Ask[] {
  return [
    {
      id: "pdf",
      label: <Trans>Cards from a PDF</Trans>,
      assistant: "Claude",
      turns: [
        {
          from: "you",
          body: (
            <>
              <Attachment
                name="Lecture 6 - Cell transport.pdf"
                kind={<Trans>PDF · 12 pages</Trans>}
              />
              <Trans>Make cards from the new terms in this.</Trans>
            </>
          ),
        },
        {
          from: "them",
          body: (
            <Added
              card={{
                label: msg`Biology · new`,
                term: "homeostasis",
                meaning: msg`Keeping the body’s inside conditions steady`,
              }}
            >
              <Trans>Added 8 cards to Biology. I skipped 2 you already have.</Trans>
            </Added>
          ),
        },
      ],
    },
    {
      id: "deck",
      label: <Trans>A whole deck</Trans>,
      assistant: "ChatGPT",
      turns: [
        {
          from: "you",
          body: (
            <Trans>
              Make me a Portuguese deck for a week in Lisbon, with a section for each day.
            </Trans>
          ),
        },
        {
          from: "them",
          body: (
            <>
              <Trans>Done. Lisboa a dois has 42 cards in 5 sections.</Trans>
              <span className="mt-2.5 flex flex-wrap gap-1.5">
                {["Chegada", "No café", "O metro", "No mercado", "Fado"].map((section) => (
                  <span
                    key={section}
                    lang="pt"
                    className="rounded-full bg-plate-2 px-2.5 py-1 text-xs text-text"
                  >
                    {section}
                  </span>
                ))}
              </span>
            </>
          ),
        },
      ],
    },
    {
      id: "due",
      label: <Trans>What’s due</Trans>,
      assistant: "Gemini",
      turns: [
        { from: "you", body: <Trans>What should I review tonight?</Trans> },
        {
          from: "them",
          body: (
            <>
              <Trans>12 cards, about five minutes.</Trans>
              <DueView />
            </>
          ),
        },
      ],
    },
    {
      id: "quiz",
      label: <Trans>Quiz me</Trans>,
      assistant: "Claude",
      turns: [
        { from: "you", body: <Trans>Quiz me on this week’s Portuguese.</Trans> },
        {
          from: "them",
          body: (
            <Trans>
              What’s <Word lang="pt">a esplanada</Word>?
            </Trans>
          ),
        },
        { from: "you", body: <Trans>A café terrace?</Trans> },
        {
          from: "them",
          body: (
            <Trans>
              Yes. Next one: <Word lang="pt">o sumo</Word>.
            </Trans>
          ),
        },
      ],
    },
    {
      id: "forget",
      label: <Trans>What I keep forgetting</Trans>,
      assistant: "Grok",
      turns: [
        { from: "you", body: <Trans>Which words do I keep forgetting?</Trans> },
        {
          from: "them",
          body: (
            <>
              <Trans>These three keep slipping:</Trans>
              <span className="mt-2 grid gap-1">
                {[
                  { term: "aufhören", times: 5 },
                  { term: "Schnapsidee", times: 4 },
                  { term: "die Gewerkschaft", times: 4 },
                ].map((word) => (
                  <span
                    key={word.term}
                    className="flex items-center justify-between gap-3 rounded-md bg-plate-2 px-2.5 py-1.5"
                  >
                    <span lang="de" className="text-text">
                      {word.term}
                    </span>
                    <span className="text-xs text-muted tabular-nums">
                      <Plural value={word.times} one="Forgot # time" other="Forgot # times" />
                    </span>
                  </span>
                ))}
              </span>
              <span className="mt-2 block">
                <Trans>Want a hint for each?</Trans>
              </span>
            </>
          ),
        },
      ],
    },
    {
      id: "tidy",
      label: <Trans>Tidy a deck</Trans>,
      assistant: "ChatGPT",
      turns: [
        {
          from: "you",
          body: <Trans>Move the food words in my Portuguese deck into their own section.</Trans>,
        },
        {
          from: "them",
          body: (
            <Trans>
              Done. 9 cards are in a new section, <span lang="pt">Comida</span>.
            </Trans>
          ),
        },
      ],
    },
  ];
}

/** Each turn's moment, from the start of an ask. */
const TURN_MS = 1100;
/** How long an ask stays once its last turn is in. */
const READ_MS = 3400;

function Conversation({ ask, play }: { ask: Ask; play: boolean }) {
  const still = useStill();
  const turns = ask.turns.length;
  const beats = useMemo(
    () =>
      Object.fromEntries(
        Array.from({ length: turns }, (_, i) => [`t${i}`, 250 + i * TURN_MS]),
      ) as Record<string, number>,
    [turns],
  );
  const { at } = usePlayback(beats, play, still);
  return (
    <div className="flex min-h-[340px] flex-col justify-end gap-3 p-4 @2xl:p-5">
      {ask.turns.map((turn, i) =>
        at(`t${i}`) ? (
          <motion.div
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed script
            key={i}
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className={clsx(
              "rounded-[14px] px-3.5 py-2.5 text-sm text-pretty",
              turn.from === "you"
                ? "max-w-[82%] self-end bg-plate-2 text-text"
                : "max-w-[88%] self-start bg-plate text-text-2 edge",
            )}
          >
            {turn.body}
          </motion.div>
        ) : null,
      )}
    </div>
  );
}

/** An assistant's window with Lymi connected, playing one ask after another. */
function AssistantWindow() {
  const { t } = useLingui();
  const asks = useAsks();
  const still = useStill();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.45 });
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(false);
  const ask = asks[index] as Ask;
  const dwell = 250 + (ask.turns.length - 1) * TURN_MS + READ_MS;

  return (
    <div ref={root} className="landing-stage mx-auto mt-12 w-full max-w-[800px] @4xl:mt-14">
      <div className="relative mx-auto max-w-[680px] overflow-hidden rounded-2xl bg-canvas shadow-[0_24px_60px_-28px_oklch(0.3_0.05_300/0.45)] edge">
        <div className="flex h-12 items-center gap-2.5 border-b border-edge px-4">
          <span className="grid size-6 place-items-center [&_svg]:size-[18px]">
            <AssistantMark name={ask.assistant} />
          </span>
          <span className="text-sm font-medium text-text">{ask.assistant}</span>
          <span className="ms-auto flex items-center gap-1.5 rounded-full bg-plate px-2.5 py-1 text-xs text-text-2 edge">
            <Lantern className="size-3.5" />
            <Trans>Lymi connected</Trans>
          </span>
        </div>
        <Conversation key={ask.id} ask={ask} play={inView} />
        {!still && !picked && (
          <span
            aria-hidden="true"
            key={`${ask.id}-bar`}
            data-paused={!inView || undefined}
            onAnimationEnd={() => setIndex((i) => (i + 1) % asks.length)}
            style={{ animationDuration: `${dwell}ms` }}
            className="landing-dwell absolute inset-x-0 bottom-0 h-0.5 bg-text/15 ltr:origin-left rtl:origin-right"
          />
        )}
      </div>

      <fieldset className="m-0 mt-5 flex min-w-0 flex-wrap justify-center gap-1.5 border-0 p-0">
        <legend className="sr-only">{t`Things to ask`}</legend>
        {asks.map((each, i) => (
          <button
            key={each.id}
            type="button"
            aria-pressed={i === index}
            onClick={() => {
              setPicked(true);
              setIndex(i);
            }}
            className={clsx(
              "h-10 rounded-full px-4 text-sm transition-colors duration-150",
              i === index
                ? "bg-text font-medium text-canvas"
                : "bg-plate text-text-2 edge hoverable:hover:bg-hover hoverable:hover:text-text",
            )}
          >
            {each.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
}

const GUIDE_MARKS: AssistantName[] = [
  "Claude",
  "ChatGPT",
  "Gemini",
  "Grok",
  "Claude Code",
  "Codex",
];

/** Lymi inside the assistant a learner already uses: most of what the app does, from the chat. */
export function AssistantSection() {
  const { i18n } = useLingui();
  return (
    <section
      data-nav="landing"
      style={{ "--tray-h": 280 } as CSSProperties}
      className="use-case-tile px-5 py-20 @2xl:px-10 @4xl:py-28"
    >
      <div className="mx-auto max-w-[1040px]">
        <div className="mx-auto max-w-[680px] text-center">
          <SectionTitle>
            <Trans>Works with the AI you already use.</Trans>
          </SectionTitle>
          <p className="mt-5 text-md text-pretty text-text-2">
            <Trans>
              Connect Claude, ChatGPT, Gemini or Grok once. Then do most of it from the chat: make
              cards from a photo or a PDF, build whole decks, see what’s due and practise. You still
              review in Lymi.
            </Trans>
          </p>
        </div>
        <AssistantWindow />
        <div className="mt-10 flex items-center justify-center gap-3">
          <span aria-hidden="true" className="flex">
            {GUIDE_MARKS.map((name) => (
              <span
                key={name}
                className="-ms-1.5 grid size-8 place-items-center rounded-full bg-plate text-text edge first:ms-0 [&_svg]:size-4"
              >
                <AssistantMark name={name} />
              </span>
            ))}
          </span>
          <ArrowLink href={localizedPath("assistants", i18n.locale)}>
            <Trans>Lymi with AI assistants</Trans>
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}
