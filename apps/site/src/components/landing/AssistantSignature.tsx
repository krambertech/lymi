import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { AtSign, Check } from "lucide-react";
import { motion, useInView } from "motion/react";
import { type CSSProperties, type ReactNode, type Ref, useRef } from "react";
import { Lantern } from "../Lantern";
import { AssistantMark, type AssistantName } from "./AssistantMarks";
import { ASSISTANT_PAGES, type AssistantKey } from "./assistant-pages";
import { FeatureSection } from "./FeatureSection";
import { appear, EASE, usePlayback, useStill } from "./playback";

/** Plays a demo's beats once, the first time it is on screen. */
function useBeats<Beat extends string>(beats: Record<Beat, number>) {
  const still = useStill();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const { at } = usePlayback(beats, inView, still);
  const move = { duration: still ? 0 : 0.5, ease: EASE };
  return { ref, at, move };
}

function Tray({
  hue,
  label,
  children,
  innerRef,
}: {
  hue: number;
  label: string;
  children: ReactNode;
  innerRef: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={innerRef}
      role="img"
      aria-label={label}
      style={{ "--tray-h": hue } as CSSProperties}
      className="use-case-tile mx-auto flex w-full max-w-[480px] flex-col gap-3 rounded-[28px] p-5 @2xl:p-7"
    >
      {children}
    </div>
  );
}

function Avatar({ name }: { name: AssistantName }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-plate edge-drop [&_svg]:size-4">
      <AssistantMark name={name} />
    </span>
  );
}

const SIDEBAR_BEATS = { list: 200, mention: 1200, answer: 2200 };

/** ChatGPT: Lymi in the sidebar with each deck's due count, and a deck @-mentioned in the chat. */
function ChatgptSidebar({ hue }: { hue: number }) {
  const { t } = useLingui();
  const { ref, at, move } = useBeats(SIDEBAR_BEATS);
  const decks = [
    { name: t`Biology`, due: 12 },
    { name: t`Spanish`, due: 18 },
    { name: t`NCLEX pharmacology`, due: 7 },
  ];
  return (
    <Tray
      hue={hue}
      innerRef={ref}
      label={t`Lymi in ChatGPT’s sidebar lists three decks with what’s due in each. In the chat, the Spanish deck is mentioned with @ and ChatGPT starts a quiz on the cards you miss most.`}
    >
      <motion.div
        className="rounded-2xl bg-plate p-2 edge-drop"
        initial={false}
        animate={appear(at("list"))}
        transition={move}
      >
        <p className="flex items-center gap-2 px-2 pt-1 pb-2 text-sm font-medium text-ink">
          <Lantern className="size-5" />
          Lymi
        </p>
        <ul>
          {decks.map((deck) => (
            <li
              key={deck.name}
              className="flex h-10 items-center justify-between rounded-lg px-2 text-sm text-ink hoverable:hover:bg-plate-hover"
            >
              <span className="truncate">{deck.name}</span>
              <span className="text-ink-secondary tabular-nums">
                <Trans>{deck.due} due</Trans>
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
      <motion.p
        className="mt-2 flex items-center gap-1.5 self-end rounded-2xl rounded-ee-md bg-ink px-4 py-2.5 text-md text-canvas"
        initial={false}
        animate={appear(at("mention"))}
        transition={move}
      >
        <span className="inline-flex items-center gap-0.5 rounded-md bg-canvas/15 px-1.5 py-0.5 text-sm">
          <AtSign aria-hidden="true" className="size-3.5" />
          <Trans>Spanish</Trans>
        </span>
        <Trans>quiz me on the ones I miss</Trans>
      </motion.p>
      <motion.div
        className="flex items-start gap-2.5"
        initial={false}
        animate={appear(at("answer"))}
        transition={move}
      >
        <Avatar name="ChatGPT" />
        <p className="pt-1 text-md text-pretty text-ink">
          <Trans>
            Seven keep slipping. First one: how do you say <i>the strike</i>?
          </Trans>
        </p>
      </motion.div>
    </Tray>
  );
}

const VIEW_BEATS = { ask: 200, view: 1100 };

/** Claude: a small Lymi view in the chat, showing how a deck is doing. */
function ClaudeView({ hue }: { hue: number }) {
  const { t } = useLingui();
  const { ref, at, move } = useBeats(VIEW_BEATS);
  const stages = [
    {
      id: "known",
      count: 140,
      tone: "bg-success",
      label: (n: number) => t`${plural(n, { one: "# known", other: "# known" })}`,
    },
    {
      id: "learning",
      count: 41,
      tone: "bg-amber",
      label: (n: number) => t`${plural(n, { one: "# learning", other: "# learning" })}`,
    },
    {
      id: "new",
      count: 31,
      tone: "bg-ink-muted",
      label: (n: number) => t`${plural(n, { one: "# new", other: "# new" })}`,
    },
  ];
  const total = stages.reduce((sum, s) => sum + s.count, 0);
  return (
    <Tray
      hue={hue}
      innerRef={ref}
      label={t`Asked how the Anatomy deck is doing, Claude shows a Lymi view: 212 cards, 31 due today, 140 known, 41 learning and 31 new.`}
    >
      <motion.p
        className="self-end rounded-2xl rounded-ee-md bg-ink px-4 py-2.5 text-md text-canvas"
        initial={false}
        animate={appear(at("ask"))}
        transition={move}
      >
        <Trans>How is my Anatomy deck doing?</Trans>
      </motion.p>
      <motion.div
        className="flex items-start gap-2.5"
        initial={false}
        animate={appear(at("view"))}
        transition={move}
      >
        <Avatar name="Claude" />
        <div className="min-w-0 flex-1 rounded-2xl bg-plate p-4 edge-drop">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-md font-medium text-ink">
              <Lantern className="size-5" />
              <Trans>Anatomy</Trans>
            </p>
            <p className="rounded-full bg-amber-soft px-2.5 py-1 text-xs font-medium text-amber-text tabular-nums">
              <Trans>31 due today</Trans>
            </p>
          </div>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-plate-nested">
            {stages.map((stage) => (
              <span
                key={stage.id}
                className={stage.tone}
                style={{ width: `${(stage.count / total) * 100}%` }}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-secondary">
            {stages.map((stage) => (
              <li key={stage.id} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`size-2 rounded-full ${stage.tone}`} />
                <span className="tabular-nums">{stage.label(stage.count)}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </Tray>
  );
}

const CLI_BEATS = { status: 200, ask: 1000, call: 1800, done: 2800 };

/** Gemini CLI: Lymi connected, then cards from a README. */
function GeminiCli({ hue }: { hue: number }) {
  const { t } = useLingui();
  const { ref, at, move } = useBeats(CLI_BEATS);
  return (
    <Tray
      hue={hue}
      innerRef={ref}
      label={t`In Gemini CLI, /mcp shows Lymi connected. Asked to add the terms from a README to the Kubernetes deck, Gemini uses Lymi and adds 11 cards.`}
    >
      <div className="rounded-2xl bg-plate p-4 font-mono text-sm leading-relaxed text-ink edge-drop">
        <motion.div initial={false} animate={appear(at("status"))} transition={move}>
          <p className="text-ink-muted">&gt; /mcp</p>
          <p className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2 rounded-full bg-success" />
            lymi
            <span className="text-ink-secondary">
              <Trans>connected</Trans>
            </span>
          </p>
        </motion.div>
        <motion.p className="mt-3" initial={false} animate={appear(at("ask"))} transition={move}>
          <span className="text-ink-muted">&gt; </span>
          <Trans>Add the terms from README.md to my Kubernetes deck.</Trans>
        </motion.p>
        <motion.p
          className="mt-3 flex items-center gap-2 text-ink-secondary"
          initial={false}
          animate={appear(at("call"))}
          transition={move}
        >
          <Lantern className="size-4" />
          lymi · add_cards
          {at("done") && <Check aria-hidden="true" className="size-4 text-success" />}
        </motion.p>
        <motion.p
          className="mt-1 font-sans text-md"
          initial={false}
          animate={appear(at("done"))}
          transition={move}
        >
          <Trans>Added 11 cards to Kubernetes.</Trans>
        </motion.p>
      </div>
    </Tray>
  );
}

const TALK_BEATS = { ask: 200, read: 900, question: 1800, answer: 3000, fix: 4200 };

/** A word from the learner's deck, marked the way the cards mark AI text. */
function DeckWord({ children }: { children: ReactNode }) {
  return <mark className="rounded-xs bg-amber-soft px-0.5 text-inherit">{children}</mark>;
}

/** Grok: a Spanish conversation built on the learner's own deck. */
function GrokPractice({ hue }: { hue: number }) {
  const { t } = useLingui();
  const { ref, at, move } = useBeats(TALK_BEATS);
  const you =
    "max-w-[85%] self-end rounded-2xl rounded-ee-md bg-ink px-4 py-2.5 text-md text-canvas";
  return (
    <Tray
      hue={hue}
      innerRef={ref}
      label={t`Asked to practise with the Spanish deck, Grok reads it and asks about rent and housing using the learner’s words. The learner answers “el alquiler suba mucho” and Grok corrects it to “sube”.`}
    >
      <motion.p className={you} initial={false} animate={appear(at("ask"))} transition={move}>
        <Trans>Let’s practise. Use the words from my Spanish deck.</Trans>
      </motion.p>
      <motion.p
        className="flex h-8 w-fit items-center gap-2 rounded-full bg-plate ps-1 pe-3 text-sm text-ink-secondary edge"
        initial={false}
        animate={appear(at("read"))}
        transition={move}
      >
        <span className="grid size-6 place-items-center rounded-full bg-plate-nested">
          <Lantern className="size-4" />
        </span>
        <Trans>Read your Spanish deck</Trans>
      </motion.p>
      <motion.div
        className="flex items-start gap-2.5"
        initial={false}
        animate={appear(at("question"))}
        transition={move}
      >
        <Avatar name="Grok" />
        <p lang="es" className="pt-1 text-md text-pretty text-ink">
          ¿Qué pasa con el <DeckWord>alquiler</DeckWord> y la <DeckWord>vivienda</DeckWord> en tu
          ciudad?
        </p>
      </motion.div>
      <motion.p
        lang="es"
        className={you}
        initial={false}
        animate={appear(at("answer"))}
        transition={move}
      >
        El alquiler suba mucho cada año.
      </motion.p>
      <motion.div
        className="flex items-start gap-2.5"
        initial={false}
        animate={appear(at("fix"))}
        transition={move}
      >
        <Avatar name="Grok" />
        <p className="pt-1 text-md text-pretty text-ink">
          <Trans>
            Almost: el alquiler <b lang="es">sube</b>. <i lang="es">Suba</i> is the subjunctive.
          </Trans>
        </p>
      </motion.div>
    </Tray>
  );
}

/** The one thing this assistant does with Lymi that the others don't, beside its demo. */
export function AssistantSignature({ assistant }: { assistant: AssistantKey }) {
  const { hue } = ASSISTANT_PAGES[assistant];
  switch (assistant) {
    case "chatgpt":
      return (
        <FeatureSection
          demoFirst
          tinted
          title={<Trans>Lymi in your ChatGPT sidebar.</Trans>}
          body={
            <Trans>
              See what’s due in each deck without leaving ChatGPT. Type @ to bring a deck or a card
              into the conversation, and ChatGPT works from your own cards.
            </Trans>
          }
        >
          <ChatgptSidebar hue={hue} />
        </FeatureSection>
      );
    case "claude":
      return (
        <FeatureSection
          demoFirst
          tinted
          title={<Trans>Your decks, right in the chat.</Trans>}
          body={
            <Trans>
              Claude shows small Lymi views: what’s due, how a deck is doing, or the card you asked
              about. Lymi works in Claude Code too, so what you learn while you build can become
              cards.
            </Trans>
          }
        >
          <ClaudeView hue={hue} />
        </FeatureSection>
      );
    case "gemini":
      return (
        <FeatureSection
          demoFirst
          tinted
          title={<Trans>Cards from your terminal.</Trans>}
          body={
            <Trans>
              Add Lymi to Gemini CLI once and sign in. Then ask from the terminal: cards from a
              README, a quiz before a review, or what’s due today.
            </Trans>
          }
        >
          <GeminiCli hue={hue} />
        </FeatureSection>
      );
    case "grok":
      return (
        <FeatureSection
          demoFirst
          tinted
          title={<Trans>Practise with your own words.</Trans>}
          body={
            <Trans>
              Grok can read your decks. Ask for a conversation built on the words you’re learning,
              and it corrects you as you go. Save the new ones as cards when you’re done.
            </Trans>
          }
        >
          <GrokPractice hue={hue} />
        </FeatureSection>
      );
  }
}
