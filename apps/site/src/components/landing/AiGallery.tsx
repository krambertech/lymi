import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { AnimatePresence, motion, useInView } from "motion/react";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { type DemoProps, LeadDemo, LessonDemo, VoiceDemo, WordDemo } from "./AiDemos";
import { SectionTitle } from "./FeatureSection";
import { EASE, useStill } from "./playback";

interface StageItem {
  id: string;
  title: MessageDescriptor;
  body: MessageDescriptor;
  /** The tray hue behind the demo, from Explore's shelf colours. */
  hue: number;
  Demo: (props: DemoProps) => ReactNode;
}

const ITEMS: StageItem[] = [
  {
    id: "notes",
    title: msg`From your notes`,
    body: msg`Take a photo of your notes or add a PDF. AI picks out the terms worth learning and skips the ones you already have.`,
    hue: 110,
    Demo: LessonDemo,
  },
  {
    id: "fill",
    title: msg`A full card in seconds`,
    body: msg`Type a word, and AI adds the meaning, an example and a hint. Everything it adds is marked.`,
    hue: 25,
    Demo: WordDemo,
  },
  {
    id: "lead",
    title: msg`AI follows your lead`,
    body: msg`Give a deck instructions, or let AI follow the way you already write your cards.`,
    hue: 280,
    Demo: LeadDemo,
  },
  {
    id: "voice",
    title: msg`Native AI voice`,
    body: msg`Hear every card read aloud the way a native speaker says it.`,
    hue: 320,
    Demo: VoiceDemo,
  },
];

/** Long enough to watch a demo finish and read its line. */
const DWELL_MS = 5000;

function Shell({ children }: { children: ReactNode }) {
  return (
    <section data-nav="landing" className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="mx-auto max-w-[1040px]">
        <div className="max-w-[640px]">
          <SectionTitle>
            <Trans>AI does the busywork. You do the remembering.</Trans>
          </SectionTitle>
          <p className="mt-5 text-md text-pretty text-ink-secondary">
            <Trans>
              AI turns your notes into cards and fills in what you leave out, the way you set it up.
              It never changes what you wrote, and everything it adds is marked.
            </Trans>
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

/** One item at a time: it moves on by itself until the visitor picks one. */
function useStage() {
  const still = useStill();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.45 });
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(false);
  return {
    root,
    inView,
    index,
    item: ITEMS[index] as StageItem,
    auto: !still && !picked,
    still,
    pick: (i: number) => {
      setPicked(true);
      setIndex(i);
    },
    next: () => setIndex((i) => (i + 1) % ITEMS.length),
  };
}

type Stage = ReturnType<typeof useStage>;

/** An item's rule: it fills as the dwell timer while the stage runs itself, and stays full once picked. */
function Rule({ on, stage, id }: { on: boolean; stage: Stage; id: string }) {
  return (
    <span aria-hidden="true" className="relative block h-0.5 overflow-hidden rounded-full bg-edge">
      {on &&
        (stage.auto ? (
          <span
            key={`${id}-fill`}
            data-paused={!stage.inView || undefined}
            onAnimationEnd={stage.next}
            style={{ animationDuration: `${DWELL_MS}ms` }}
            className="landing-dwell absolute inset-0 rounded-full bg-ink ltr:origin-left rtl:origin-right"
          />
        ) : (
          <span className="absolute inset-0 rounded-full bg-ink" />
        ))}
    </span>
  );
}

function Tray({ stage, className }: { stage: Stage; className?: string }) {
  const { item, still, inView } = stage;
  return (
    <div
      style={{ "--tray-h": item.hue } as CSSProperties}
      className={clsx(
        "use-case-tile relative grid place-items-center overflow-hidden rounded-[24px] p-6 transition-[background-color] duration-700 ease-out",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={item.id}
          initial={still ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
          transition={{ duration: 0.4, ease: EASE }}
          className="flex w-full justify-center"
        >
          <item.Demo play={inView} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** What AI does for a card: one demo on a tray, beside a list where only the item on stage shows its line. */
export function AiGallery() {
  const { i18n } = useLingui();
  const stage = useStage();
  return (
    <Shell>
      <div
        ref={stage.root}
        className="landing-stage mt-12 grid gap-8 @4xl:mt-14 @4xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] @4xl:gap-14"
      >
        {/* Narrow, the notes demo stacks and is the tallest; the tray holds that height for all four. */}
        <Tray stage={stage} className="min-h-[484px] @2xl:min-h-[340px] @4xl:min-h-[400px]" />
        <ul className="grid content-start @4xl:pt-2">
          {ITEMS.map((each, i) => {
            const on = i === stage.index;
            return (
              <li key={each.id}>
                <Rule on={on} stage={stage} id={each.id} />
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => stage.pick(i)}
                  className="group block w-full py-4 text-start"
                >
                  <span
                    className={clsx(
                      "block text-lg font-medium tracking-[-0.015em] transition-colors duration-200",
                      on ? "text-ink" : "text-ink-secondary hoverable:group-hover:text-ink",
                    )}
                  >
                    {i18n._(each.title)}
                  </span>
                  <span
                    className={clsx(
                      "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                      on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <span className="overflow-hidden">
                      <span className="block max-w-[40ch] pt-1.5 pb-1 text-sm text-pretty text-ink-secondary">
                        {i18n._(each.body)}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Shell>
  );
}
