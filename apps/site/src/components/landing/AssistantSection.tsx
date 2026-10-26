import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
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
  ask: ReactNode;
  /** What Lymi did, as the assistant reports it. */
  did: ReactNode;
  /** Where the bubble floats around the heading on a wide screen. */
  place: CSSProperties;
  /** How far it drifts against the scroll, in px; opposite signs pull bubbles apart. */
  drift: number;
}

function useAsks(): Ask[] {
  return [
    {
      id: "pdf",
      from: "Claude",
      ask: <Trans>Make cards from the new terms in this PDF.</Trans>,
      did: <Trans>Added 8 cards to Biology</Trans>,
      place: { insetInlineStart: "0%", top: "4%" },
      drift: 36,
    },
    {
      id: "deck",
      from: "ChatGPT",
      ask: <Trans>Make me a Portuguese deck for a week in Lisbon, a section a day.</Trans>,
      did: (
        <Trans>
          Made <span lang="pt">Lisboa a dois</span>: 42 cards in 5 sections
        </Trans>
      ),
      place: { insetInlineEnd: "0%", top: "0%" },
      drift: -28,
    },
    {
      id: "due",
      from: "Gemini",
      ask: <Trans>What should I review tonight?</Trans>,
      did: <Trans>12 cards due, about five minutes</Trans>,
      place: { insetInlineStart: "0%", top: "41%" },
      drift: -22,
    },
    {
      id: "forget",
      from: "Grok",
      ask: <Trans>Which words do I keep forgetting?</Trans>,
      did: (
        <Trans>
          <span lang="de">aufhören</span>, <span lang="de">Schnapsidee</span> and{" "}
          <span lang="de">die Gewerkschaft</span>
        </Trans>
      ),
      place: { insetInlineEnd: "0%", top: "43%" },
      drift: 30,
    },
    {
      id: "quiz",
      from: "Claude",
      ask: <Trans>Quiz me on this week’s Portuguese.</Trans>,
      did: <Trans>Ten questions from your due cards</Trans>,
      place: { insetInlineStart: "11%", bottom: "0%" },
      drift: 24,
    },
    {
      id: "tidy",
      from: "ChatGPT",
      ask: <Trans>Move the food words into their own section.</Trans>,
      did: (
        <Trans>
          Moved 9 cards to <span lang="pt">Comida</span>
        </Trans>
      ),
      place: { insetInlineEnd: "9%", bottom: "4%" },
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
  const start = 0.16 + index * 0.045;
  const opacity = useTransform(progress, [start, start + 0.08], [0, 1]);
  const scale = useTransform(progress, [start, start + 0.1], [0.92, 1]);
  const rise = useTransform(progress, [start, start + 0.1], [18, 0]);
  const drift = useTransform(progress, [0, 1], [ask.drift, -ask.drift]);
  const y = useTransform(() => rise.get() + (wide ? drift.get() : 0));
  const reply = useTransform(progress, [start + 0.07, start + 0.13], [0, 1]);

  return (
    <motion.div
      // Insets only take effect once the bubble is absolute, on a wide screen.
      style={
        still ? { ...ask.place, opacity: 1, scale: 1, y: 0 } : { ...ask.place, opacity, scale, y }
      }
      className={clsx(
        "w-max max-w-[268px] @4xl:absolute",
        index % 2 ? "self-end" : "self-start",
        index >= NARROW_COUNT && "@max-4xl:hidden",
      )}
    >
      <div className="rounded-[18px] rounded-es-md bg-plate px-3.5 py-2.5 shadow-[0_14px_32px_-20px_oklch(0.3_0.04_280/0.45)] edge">
        <p className="flex items-center gap-1.5 text-2xs text-muted">
          <span className="grid size-4 place-items-center [&_svg]:size-3.5">
            <AssistantMark name={ask.from} />
          </span>
          {ask.from}
        </p>
        <p className="mt-1 text-sm text-pretty text-text">{ask.ask}</p>
      </div>
      <motion.p
        style={{ opacity: still ? 1 : reply }}
        className="mt-1.5 flex items-start gap-1.5 ps-2 text-xs text-pretty text-text-2"
      >
        <Lantern className="mt-px size-3.5 shrink-0" />
        <span>{ask.did}</span>
      </motion.p>
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
    <div className="mx-auto max-w-[440px] text-center">
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
      className="overflow-x-clip px-5 py-20 @2xl:px-10 @4xl:py-28"
    >
      {/* Wide, the heading sits in the middle with the bubbles around it; narrow, they run below it. */}
      <div className="relative mx-auto max-w-[480px] @4xl:grid @4xl:h-[560px] @4xl:max-w-[1040px] @4xl:place-items-center">
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
