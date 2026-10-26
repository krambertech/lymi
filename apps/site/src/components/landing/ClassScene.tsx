import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Check } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { EASE, useStill } from "./playback";

const DECK = msg`Tuesday Japanese class`;
const LEARNERS = 12;
const STARTING_CARDS = 38;

interface Person {
  id: string;
  name: string;
  /** The cursor's colour, as an OKLCH hue. */
  hue: number;
}

const PEOPLE: Person[] = [
  { id: "mari", name: "Mari", hue: 25 },
  { id: "jonas", name: "Jonas", hue: 235 },
  { id: "aiko", name: "Aiko", hue: 150 },
];

/** What happens in the class deck, one at a time. */
const EVENTS: { who: string; finished?: number; added?: number }[] = [
  { who: "mari", finished: 2 },
  { who: "jonas", added: 4 },
  { who: "aiko", finished: 2 },
  { who: "jonas", finished: 1 },
];
const EVENT_MS = 2400;

/** Who has finished each week before the scene starts. */
const START: string[][] = [["mari", "jonas", "aiko"], ["mari", "aiko"], [], []];

/** Where each cursor wanders, in percent of the scene, kept clear of the deck in the middle. */
const PATHS: Record<string, { x: string[]; y: string[]; delay: number }> = {
  mari: { x: ["4%", "22%", "40%", "14%", "4%"], y: ["80%", "86%", "78%", "88%", "80%"], delay: 0 },
  jonas: { x: ["70%", "56%", "40%", "64%", "70%"], y: ["6%", "10%", "6%", "4%", "6%"], delay: 1.5 },
  aiko: {
    x: ["66%", "74%", "60%", "70%", "66%"],
    y: ["86%", "78%", "88%", "80%", "86%"],
    delay: 3,
  },
};

function Avatar({ id, size }: { id: string; size: number }) {
  return (
    <img
      src={`/avatars/${id}.svg`}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full ring-2 ring-plate"
      style={{ width: size, height: size }}
    />
  );
}

function Arrow({ fill }: { fill: string }) {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true" className="drop-shadow-sm">
      <path
        d="M1 1l13 7.5-6 1.4L5 16z"
        fill={fill}
        stroke="white"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Cursor({ who, moving }: { who: Person; moving: boolean }) {
  const path = PATHS[who.id] as (typeof PATHS)[string];
  // check-styling: allow, each classmate's cursor keeps its own colour in both themes
  const color = `oklch(0.6 0.15 ${who.hue})`;
  return (
    <motion.div
      className="pointer-events-none absolute z-10"
      initial={{ left: path.x[0], top: path.y[0] }}
      animate={moving ? { left: path.x, top: path.y } : undefined}
      transition={{
        duration: 11,
        delay: path.delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
    >
      <Arrow fill={color} />
      <span
        style={{ background: color }}
        className="-mt-1 ms-3 flex items-center gap-1 rounded-full py-0.5 ps-0.5 pe-2 text-2xs font-medium text-white shadow-sm"
      >
        <img
          src={`/avatars/${who.id}.svg`}
          alt=""
          width={16}
          height={16}
          className="size-4 rounded-full"
        />
        {who.name}
      </span>
    </motion.div>
  );
}

/** Each note is one whole message, so a translation can agree the verb with who did it. */
function EventLine({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <Trans>
          <span className="font-medium">Mari</span> finished Week 3
        </Trans>
      );
    case 1:
      return (
        <Trans>
          <span className="font-medium">Jonas</span> added 4 cards to Week 4
        </Trans>
      );
    case 2:
      return (
        <Trans>
          <span className="font-medium">Aiko</span> finished Week 3
        </Trans>
      );
    default:
      return (
        <Trans>
          <span className="font-medium">Jonas</span> finished Week 2
        </Trans>
      );
  }
}

const WEEKS = [msg`Week 1`, msg`Week 2`, msg`Week 3`, msg`Week 4`];

/**
 * One shared deck with the class moving through it: classmates' cursors, and a note each time one
 * of them finishes a week or adds cards. A visitor's own pointer joins as "You".
 */
export function ClassScene() {
  const { i18n } = useLingui();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const still = useStill();
  const [step, setStep] = useState(-1);
  const [you, setYou] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!inView || still) return;
    const timer = window.setInterval(() => setStep((s) => (s + 1) % (EVENTS.length + 1)), EVENT_MS);
    return () => window.clearInterval(timer);
  }, [inView, still]);

  const done = START.map((ids) => [...ids]);
  let cards = STARTING_CARDS;
  for (let i = 0; i <= step && i < EVENTS.length; i++) {
    const event = EVENTS[i] as (typeof EVENTS)[number];
    if (event.finished !== undefined) done[event.finished]?.push(event.who);
    if (event.added) cards += event.added;
  }
  const event = step >= 0 && step < EVENTS.length ? EVENTS[step] : undefined;

  const follow = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const box = e.currentTarget.getBoundingClientRect();
    setYou({ x: e.clientX - box.left, y: e.clientY - box.top });
  };

  return (
    <div
      ref={ref}
      aria-hidden="true"
      onPointerMove={follow}
      onPointerLeave={() => setYou(null)}
      className="relative grid h-full min-h-[280px] w-full place-items-center overflow-hidden px-5"
    >
      {PEOPLE.map((p) => (
        <Cursor key={p.id} who={p} moving={inView && !still} />
      ))}
      {you && (
        <div className="pointer-events-none absolute z-20" style={{ left: you.x, top: you.y }}>
          <Arrow fill="var(--text)" />
          <span className="-mt-1 ms-3 block rounded-full bg-text px-2 py-0.5 text-2xs font-medium text-canvas">
            <Trans>You</Trans>
          </span>
        </div>
      )}

      <div className="relative w-full max-w-[340px] rounded-xl bg-plate p-3.5 edge">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-md font-medium tracking-[-0.02em] text-text">
              {i18n._(DECK)}
            </p>
            <p className="text-xs text-muted">
              <Plural value={cards} one="# card" other="# cards" /> ·{" "}
              <Plural value={LEARNERS} one="# learner" other="# learners" />
            </p>
          </div>
          <span className="flex">
            {PEOPLE.map((p) => (
              <span key={p.id} className="-ms-1.5 first:ms-0">
                <Avatar id={p.id} size={26} />
              </span>
            ))}
          </span>
        </div>
        <ul className="mt-3 grid grid-cols-4 gap-1">
          {WEEKS.map((week, i) => {
            const who = done[i] ?? [];
            return (
              <li key={week.id} className="grid gap-1 rounded-md bg-plate-2 px-1.5 py-1.5">
                <span className="text-2xs whitespace-nowrap text-text-2">{i18n._(week)}</span>
                <span className="flex h-4 items-center">
                  {who.length === 0 ? (
                    <span className="h-1 w-4 rounded-full bg-edge-2" />
                  ) : (
                    who.map((id) => (
                      <motion.span
                        key={id}
                        initial={still ? false : { scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className="-ms-1 first:ms-0"
                      >
                        <Avatar id={id} size={16} />
                      </motion.span>
                    ))
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        <AnimatePresence>
          {event && (
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="absolute -top-4 start-1/2 flex w-max max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-1.5 rounded-full bg-text py-1 ps-1 pe-3 text-xs text-canvas shadow-lg rtl:translate-x-1/2"
            >
              <img
                src={`/avatars/${event.who}.svg`}
                alt=""
                width={18}
                height={18}
                className="size-[18px] rounded-full"
              />
              <span>
                <EventLine index={step} />
              </span>
              {event.finished !== undefined && (
                <Check aria-hidden="true" className="size-3.5 text-good" />
              )}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
