import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { FileText } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { localizedPath } from "../../lib/routes";
import { Lantern } from "../Lantern";
import { ArrowLink } from "./ArrowLink";
import { AssistantMark, type AssistantName } from "./AssistantMarks";
import { SectionTitle } from "./FeatureSection";
import { EASE, useStill } from "./playback";

interface Ask {
  id: string;
  from: AssistantName;
  /** The bubble's tint, a tray hue, so each assistant reads as its own conversation. */
  hue: number;
  ask: ReactNode;
  /** Something sent with the request, such as a file. */
  attachment?: ReactNode;
  /** What Lymi did, as the assistant reports it. */
  did: ReactNode;
}

const HUES: Record<string, number> = { Claude: 25, ChatGPT: 150, Gemini: 235, Grok: 280 };

function ask(
  id: string,
  from: AssistantName,
  text: ReactNode,
  did: ReactNode,
  attachment?: ReactNode,
): Ask {
  return {
    id,
    from,
    hue: HUES[from] ?? 235,
    ask: text,
    did,
    ...(attachment ? { attachment } : {}),
  };
}

/** Requests to different assistants, each with what Lymi did. Only things the tools really do. */
function useAsks(): Ask[] {
  return [
    ask(
      "pdf",
      "Claude",
      <Trans>Make cards from the new terms in this PDF.</Trans>,
      <Trans>Added 8 cards to Biology</Trans>,
      <span className="mb-2 flex w-fit items-center gap-2 rounded-lg bg-plate py-1.5 ps-1.5 pe-3 edge">
        <span className="grid size-6 place-items-center rounded-md bg-amber-soft text-amber-text">
          <FileText aria-hidden="true" className="size-3.5" />
        </span>
        <span className="text-xs font-medium text-ink">Lecture 6.pdf</span>
      </span>,
    ),
    ask(
      "deck",
      "ChatGPT",
      <Trans>Make me a Portuguese deck for a week in Lisbon, a section a day.</Trans>,
      <Trans>
        Made <span lang="pt">Lisboa a dois</span>: 42 cards in 5 sections
      </Trans>,
    ),
    ask(
      "due",
      "Gemini",
      <Trans>What should I review tonight?</Trans>,
      <Trans>12 cards due, about five minutes</Trans>,
    ),
    ask(
      "forget",
      "Grok",
      <Trans>Which words do I keep forgetting?</Trans>,
      <Trans>
        Three keep slipping: <span lang="de">aufhören, Schnapsidee, die Gewerkschaft</span>
      </Trans>,
    ),
    ask(
      "quiz",
      "Claude",
      <Trans>Quiz me on this week’s Portuguese.</Trans>,
      <Trans>Ten questions from your due cards</Trans>,
    ),
    ask(
      "tidy",
      "ChatGPT",
      <Trans>Move the food words into their own section.</Trans>,
      <Trans>
        Moved 9 cards to <span lang="pt">Comida</span>
      </Trans>,
    ),
    ask(
      "hint",
      "Gemini",
      <Trans>Add a hint to the kanji I got wrong this week.</Trans>,
      <Trans>Added hints to 6 cards in Japanese</Trans>,
    ),
    ask(
      "exam",
      "Grok",
      <Trans>Tag everything that’s on Friday’s anatomy exam.</Trans>,
      <Trans>Tagged 31 cards “exam”</Trans>,
    ),
    ask(
      "word",
      "Claude",
      <Trans>Save “Feierabend” to my German deck.</Trans>,
      <Trans>Added 1 card, with an example and a hint</Trans>,
    ),
  ];
}

const GUIDE_MARKS: AssistantName[] = ["Claude", "ChatGPT", "Gemini", "Grok"];

function Heading() {
  const { i18n } = useLingui();
  return (
    <div className="max-w-[440px]">
      <SectionTitle>
        <Trans>Bring your own AI.</Trans>
      </SectionTitle>
      <p className="mt-5 text-md text-pretty text-ink-secondary">
        <Trans>
          Connect Claude, ChatGPT, Gemini or Grok once. Then make cards, build decks and get quizzed
          right from the chat. You still review in Lymi.
        </Trans>
      </p>
      <div className="mt-6 flex items-center gap-3">
        <span aria-hidden="true" className="flex">
          {GUIDE_MARKS.map((name) => (
            <span
              key={name}
              className="-ms-1.5 grid size-8 place-items-center rounded-full bg-plate text-ink edge first:ms-0 [&_svg]:size-4"
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
  );
}

function Avatar({ name }: { name: AssistantName }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-plate text-ink shadow-[0_6px_14px_-8px_oklch(0.3_0.04_280/0.5)] edge [&_svg]:size-[18px]">
      <AssistantMark name={name} />
    </span>
  );
}

/** A request as a chat bubble on its assistant's hue. `mirrored` puts the avatar at the end. */
function AskBubble({ ask: item, mirrored }: { ask: Ask; mirrored?: boolean }) {
  return (
    <div className={clsx("flex items-end gap-2.5", mirrored && "flex-row-reverse")}>
      <Avatar name={item.from} />
      <div
        style={{ "--tray-h": item.hue } as CSSProperties}
        className={clsx(
          "use-case-tile rounded-[20px] px-4 py-3 shadow-[0_16px_34px_-22px_oklch(0.3_0.05_280/0.5)]",
          mirrored ? "rounded-ee-md" : "rounded-es-md",
        )}
      >
        <p className="text-xs font-medium text-ink-secondary">{item.from}</p>
        <div className="mt-0.5">
          {item.attachment}
          <p className="text-md text-pretty text-ink">{item.ask}</p>
        </div>
      </div>
    </div>
  );
}

/** What Lymi did, on white with the lantern, under the request it answers. */
function Reply({ ask: item, mirrored }: { ask: Ask; mirrored?: boolean }) {
  return (
    <p
      className={clsx(
        "mt-2 flex w-fit items-start gap-2 rounded-xl bg-plate px-3 py-2 text-sm text-pretty text-ink shadow-[0_12px_28px_-20px_oklch(0.3_0.04_60/0.55)] edge",
        mirrored ? "ms-auto me-[46px]" : "ms-[46px]",
      )}
    >
      <Lantern className="mt-0.5 size-4 shrink-0" />
      <span>{item.did}</span>
    </p>
  );
}

const EVERY_MS = 2600;
/** Pairs kept mounted; the oldest have already risen out through the fade. */
const KEPT = 5;
/** How long the pairs already there take to rise clear before the new one shows. */
const ARRIVE_S = 0.45;

/**
 * The claim on the start side; on the end side, requests to different assistants keep arriving at
 * the foot of a window with no frame, and rise out through a fade at its top.
 */
export function AssistantSection() {
  const asks = useAsks();
  const still = useStill();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const [head, setHead] = useState(2);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (still || !inView || held) return;
    const timer = window.setInterval(() => setHead((h) => h + 1), EVERY_MS);
    return () => window.clearInterval(timer);
  }, [still, inView, held]);

  const from = still ? 0 : Math.max(0, head - KEPT + 1);
  const to = still ? 2 : head;
  const rows = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  return (
    <section data-nav="landing" className="overflow-x-clip px-5 py-16 @2xl:px-10 @4xl:py-14">
      <div className="mx-auto grid max-w-[480px] items-center gap-10 @4xl:max-w-[1040px] @4xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)] @4xl:gap-16">
        <Heading />
        <div
          ref={ref}
          aria-hidden="true"
          onPointerEnter={(e) => e.pointerType === "mouse" && setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          className="flex h-[360px] flex-col justify-end gap-5 overflow-hidden pb-4 [mask-image:linear-gradient(to_bottom,transparent,black_32%,black_94%,transparent)] @4xl:h-[340px] @4xl:w-full @4xl:max-w-[440px] @4xl:justify-self-end"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {rows.map((n) => {
              const ask = asks[n % asks.length] as Ask;
              const mirrored = n % 2 === 1;
              return (
                <motion.div
                  key={n}
                  layout={still ? false : "position"}
                  // The pairs above rise first; the new one fades in once its place is clear.
                  initial={still ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{
                    layout: { duration: 0.55, ease: EASE },
                    default: { duration: 0.45, ease: EASE, delay: ARRIVE_S },
                  }}
                  className={mirrored ? "ms-auto w-fit max-w-[340px]" : "w-fit max-w-[340px]"}
                >
                  <AskBubble ask={ask} mirrored={mirrored} />
                  <motion.div
                    initial={still || n <= 2 ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE, delay: ARRIVE_S + 0.55 }}
                  >
                    <Reply ask={ask} mirrored={mirrored} />
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
