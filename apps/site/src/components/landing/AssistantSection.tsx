import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { FileText } from "lucide-react";
import { type MotionValue, motion, useScroll, useSpring, useTransform } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { localizedPath } from "../../lib/routes";
import { Lantern } from "../Lantern";
import { ArrowLink } from "./ArrowLink";
import { AssistantMark, type AssistantName } from "./AssistantMarks";
import { SectionTitle } from "./FeatureSection";
import { useStill } from "./playback";

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
  /** A detail under the reply: the deck's sections, the words, a button. */
  detail?: ReactNode;
  /** Where the bubble floats around the heading on a wide screen. */
  place: CSSProperties;
  /** How far it drifts against the scroll, in px; opposite signs pull bubbles apart. */
  drift: number;
}

function Chip({ children, lang }: { children: ReactNode; lang?: string }) {
  return (
    <span lang={lang} className="rounded-full bg-plate-2 px-2 py-0.5 text-2xs text-text">
      {children}
    </span>
  );
}

function useAsks(): Ask[] {
  return [
    {
      id: "pdf",
      from: "Claude",
      hue: 25,
      ask: <Trans>Make cards from the new terms in this PDF.</Trans>,
      attachment: (
        <span className="mb-2 flex w-fit items-center gap-2 rounded-lg bg-plate py-1.5 ps-1.5 pe-3 edge">
          <span className="grid size-6 place-items-center rounded-md bg-amber-soft text-amber-text">
            <FileText aria-hidden="true" className="size-3.5" />
          </span>
          <span className="text-xs font-medium text-text">Lecture 6.pdf</span>
        </span>
      ),
      did: <Trans>Added 8 cards to Biology</Trans>,
      place: { insetInlineStart: "0%", top: "0%" },
      drift: 36,
    },
    {
      id: "deck",
      from: "ChatGPT",
      hue: 150,
      ask: <Trans>Make me a Portuguese deck for a week in Lisbon, a section a day.</Trans>,
      did: (
        <Trans>
          Made <span lang="pt">Lisboa a dois</span>: 42 cards in 5 sections
        </Trans>
      ),
      detail: (
        <span className="flex flex-wrap gap-1">
          {["Chegada", "No café", "O metro"].map((section) => (
            <Chip key={section} lang="pt">
              {section}
            </Chip>
          ))}
          <Chip>+2</Chip>
        </span>
      ),
      place: { insetInlineEnd: "0%", top: "0%" },
      drift: -28,
    },
    {
      id: "due",
      from: "Gemini",
      hue: 235,
      ask: <Trans>What should I review tonight?</Trans>,
      did: <Trans>12 cards due, about five minutes</Trans>,
      detail: (
        <span className="flex h-7 w-fit items-center rounded-md bg-amber px-2.5 text-2xs font-medium text-amber-ink key-light">
          <Trans>Review in Lymi</Trans>
        </span>
      ),
      place: { insetInlineStart: "0%", top: "42%" },
      drift: -22,
    },
    {
      id: "forget",
      from: "Grok",
      hue: 280,
      ask: <Trans>Which words do I keep forgetting?</Trans>,
      did: <Trans>These three keep slipping</Trans>,
      detail: (
        <span className="flex flex-wrap gap-1">
          {["aufhören", "Schnapsidee", "die Gewerkschaft"].map((word) => (
            <Chip key={word} lang="de">
              {word}
            </Chip>
          ))}
        </span>
      ),
      place: { insetInlineEnd: "0%", top: "44%" },
      drift: 30,
    },
    {
      id: "quiz",
      from: "Claude",
      hue: 25,
      ask: <Trans>Quiz me on this week’s Portuguese.</Trans>,
      did: <Trans>Ten questions from your due cards</Trans>,
      place: { insetInlineStart: "12%", bottom: "0%" },
      drift: 24,
    },
    {
      id: "tidy",
      from: "ChatGPT",
      hue: 150,
      ask: <Trans>Move the food words into their own section.</Trans>,
      did: (
        <Trans>
          Moved 9 cards to <span lang="pt">Comida</span>
        </Trans>
      ),
      place: { insetInlineEnd: "10%", bottom: "2%" },
      drift: -34,
    },
  ];
}

function Bubble({
  ask,
  index,
  progress,
  still,
  wide,
}: {
  ask: Ask;
  index: number;
  progress: MotionValue<number>;
  still: boolean;
  /** Floating around the heading, so it drifts; in the narrow column it only rises in. */
  wide: boolean;
}) {
  // Each bubble arrives at its own point in the scroll, and its reply a moment after.
  const start = 0.06 + index * 0.04;
  const opacity = useTransform(progress, [start, start + 0.07], [0, 1]);
  const scale = useTransform(progress, [start, start + 0.09], [0.9, 1]);
  const rise = useTransform(progress, [start, start + 0.09], [20, 0]);
  const drift = useTransform(progress, [0, 1], [ask.drift, -ask.drift]);
  const y = useTransform(() => rise.get() + (wide ? drift.get() : 0));
  const reply = useTransform(progress, [start + 0.06, start + 0.12], [0, 1]);
  const replyRise = useTransform(progress, [start + 0.06, start + 0.12], [8, 0]);

  return (
    <motion.div
      // Insets only take effect once the bubble is absolute, on a wide screen.
      style={
        still ? { ...ask.place, opacity: 1, scale: 1, y: 0 } : { ...ask.place, opacity, scale, y }
      }
      className={clsx(
        "w-max max-w-[292px] @4xl:absolute",
        index % 2 ? "self-end" : "self-start",
        index >= NARROW_COUNT && "@max-4xl:hidden",
      )}
    >
      <div className="flex items-end gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-plate shadow-[0_6px_14px_-8px_oklch(0.3_0.04_280/0.5)] edge [&_svg]:size-4">
          <AssistantMark name={ask.from} />
        </span>
        <div
          style={{ "--tray-h": ask.hue } as CSSProperties}
          className="use-case-tile rounded-[20px] rounded-es-md px-3.5 py-2.5 shadow-[0_16px_34px_-22px_oklch(0.3_0.05_280/0.5)]"
        >
          <p className="text-2xs font-medium text-text-2">{ask.from}</p>
          <div className="mt-1">
            {ask.attachment}
            <p className="text-sm text-pretty text-text">{ask.ask}</p>
          </div>
        </div>
      </div>
      <motion.div
        style={still ? { opacity: 1 } : { opacity: reply, y: replyRise }}
        className="ms-10 mt-2 grid w-fit max-w-[244px] gap-2 rounded-xl bg-plate px-3 py-2 shadow-[0_12px_28px_-20px_oklch(0.3_0.04_60/0.55)] edge"
      >
        <p className="flex items-start gap-1.5 text-xs text-pretty text-text">
          <Lantern className="mt-px size-3.5 shrink-0" />
          <span>{ask.did}</span>
        </p>
        {ask.detail}
      </motion.div>
    </motion.div>
  );
}

/** How many requests the narrow column shows. */
const NARROW_COUNT = 4;

/** Whether the bubbles float around the heading; matches the section's wide layout. */
function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 960px)");
    setWide(query.matches);
    const change = () => setWide(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  return wide;
}

const GUIDE_MARKS: AssistantName[] = ["Claude", "ChatGPT", "Gemini", "Grok"];

function Heading() {
  const { i18n } = useLingui();
  return (
    <div className="relative mx-auto max-w-[420px] text-center">
      <Lantern glow flicker className="mx-auto mb-6 size-12" />
      <SectionTitle>
        <Trans>Bring your own AI.</Trans>
      </SectionTitle>
      <p className="mt-5 text-md text-pretty text-text-2">
        <Trans>
          Connect Claude, ChatGPT, Gemini or Grok once. Then make cards, build decks and get quizzed
          right from the chat. You still review in Lymi.
        </Trans>
      </p>
      <div className="mt-7 flex items-center justify-center gap-3">
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
  );
}

/**
 * Lymi inside the assistant a learner already uses: the claim in the middle, and requests to
 * different assistants arriving around it as the section scrolls in, each with what Lymi did.
 */
export function AssistantSection() {
  const asks = useAsks();
  const still = useStill();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  const wide = useWide();

  return (
    <section
      ref={ref}
      data-nav="landing"
      className="overflow-x-clip px-5 py-16 @2xl:px-10 @4xl:py-20"
    >
      {/* Wide, the heading sits in the middle with the bubbles around it; narrow, they run below it. */}
      <div className="relative mx-auto max-w-[480px] @4xl:grid @4xl:h-[600px] @4xl:max-w-[1040px] @4xl:place-items-center">
        <Heading />
        <div aria-hidden="true" className="mt-10 flex flex-col gap-4 @4xl:contents">
          {asks.map((ask, i) => (
            <Bubble
              key={ask.id}
              ask={ask}
              index={i}
              progress={progress}
              still={still}
              wide={wide}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
