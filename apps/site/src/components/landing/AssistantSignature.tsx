import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { AtSign, Check, Repeat } from "lucide-react";
import { motion, useInView } from "motion/react";
import { type ReactNode, type Ref, useContext, useRef } from "react";
import { trayStyle } from "../../lib/tray";
import { Lantern } from "../Lantern";
import { BACKDROPS, BackdropContext } from "./AssistantChatDemo";
import { ASSISTANT_PAGES, type AssistantKey } from "./assistant-pages";
import { AssistantAvatar, LearnerBubble, ToolCall } from "./ChatParts";
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
  const backdrop = useContext(BackdropContext);
  return (
    <div
      ref={innerRef}
      role="img"
      aria-label={label}
      style={trayStyle(hue)}
      className={clsx("mx-auto flex w-full max-w-[480px] flex-col gap-3", BACKDROPS[backdrop])}
    >
      {children}
    </div>
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
      <LearnerBubble initial={false} animate={appear(at("mention"))} transition={move}>
        <span className="inline-flex items-center gap-0.5 rounded-md bg-canvas/15 px-1.5 py-0.5 text-sm">
          <AtSign aria-hidden="true" className="size-3.5" />
          <Trans>Spanish</Trans>
        </span>{" "}
        <Trans>quiz me on the ones I miss</Trans>
      </LearnerBubble>
      <motion.div
        className="flex items-start gap-2.5"
        initial={false}
        animate={appear(at("answer"))}
        transition={move}
      >
        <AssistantAvatar name="ChatGPT" />
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
      <LearnerBubble initial={false} animate={appear(at("ask"))} transition={move}>
        <Trans>How is my Anatomy deck doing?</Trans>
      </LearnerBubble>
      <motion.div
        className="flex items-start gap-2.5"
        initial={false}
        animate={appear(at("view"))}
        transition={move}
      >
        <AssistantAvatar name="Claude" />
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

const ROUTINE_BEATS = { routine: 200, ran: 1200, due: 2000, quiz: 3000 };

/** Grok Bot: a morning routine that checks Lymi and starts a quiz on what's due. */
function GrokRoutine({ hue }: { hue: number }) {
  const { t } = useLingui();
  const { ref, at, move } = useBeats(ROUTINE_BEATS);
  return (
    <Tray
      hue={hue}
      innerRef={ref}
      label={t`A Grok Bot routine runs every day at 8:00: check what’s due in Lymi and quiz me. This morning it found 12 Spanish cards due, about five minutes, and asked how to say “the strike”.`}
    >
      <motion.div
        className="flex items-center gap-3 rounded-2xl bg-plate p-3 edge-drop"
        initial={false}
        animate={appear(at("routine"))}
        transition={move}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-plate-nested text-ink-secondary">
          <Repeat aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">
            <Trans>Every day at 8:00</Trans>
          </span>
          <span className="block truncate text-sm text-ink-secondary">
            <Trans>Check what’s due in Lymi and quiz me</Trans>
          </span>
        </span>
        <span aria-hidden="true" className="h-6 w-10 shrink-0 rounded-full bg-success p-0.5">
          <span className="block size-5 translate-x-4 rounded-full bg-plate rtl:-translate-x-4" />
        </span>
      </motion.div>
      <ToolCall initial={false} animate={appear(at("ran"))} transition={move}>
        <Trans>Today, 8:00 · checked Lymi</Trans>
      </ToolCall>
      <motion.div
        className="flex items-start gap-2.5"
        initial={false}
        animate={appear(at("due"))}
        transition={move}
      >
        <AssistantAvatar name="Grok Bot" />
        <p className="pt-1 text-md text-pretty text-ink">
          <Trans>12 Spanish cards are due, about five minutes. Quick warm-up first?</Trans>
        </p>
      </motion.div>
      <motion.div
        className="flex items-start gap-2.5"
        initial={false}
        animate={appear(at("quiz"))}
        transition={move}
      >
        <AssistantAvatar name="Grok Bot" />
        <p className="pt-1 text-md text-pretty text-ink">
          <Trans>
            How do you say <i>the strike</i>?
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
          title={<Trans>Your review, on a routine.</Trans>}
          body={
            <Trans>
              Grok Bot can check Lymi on a schedule. Make it a routine, and each morning it tells
              you what’s due and warms you up on the words that keep slipping. Its cloud computer
              keeps running when your laptop is closed.
            </Trans>
          }
        >
          <GrokRoutine hue={hue} />
        </FeatureSection>
      );
  }
}
