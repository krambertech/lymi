import { cn } from "cn";
import { Check, FileText } from "lucide-react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReduceMotion } from "../lib/use-reduce-motion";

export interface ScanPage {
  id: string;
  /** An object URL for a photo; a PDF has none. */
  url: string | null;
  name: string;
}

export interface ScanProps {
  pages: ScanPage[];
  text: string;
  finished: boolean;
  /** The page under the light. */
  current: number;
}

const EASE = [0.23, 1, 0.32, 1] as const;
const PAGE_W = 168;
const PAGE_H = 224;

function PageFace({
  page,
  text,
  className,
}: {
  page: ScanPage | undefined;
  text: string;
  className?: string;
}) {
  if (page?.url)
    return (
      <img
        src={page.url}
        alt=""
        draggable={false}
        className={cn("image-edge size-full rounded-lg object-cover", className)}
      />
    );
  if (page)
    return (
      <div
        className={cn(
          "grid size-full place-content-center justify-items-center gap-1.5 rounded-lg bg-plate-nested text-ink-muted",
          className,
        )}
      >
        <FileText className="size-7" aria-hidden="true" />
        <span className="max-w-[90%] truncate px-2 text-xs">{page.name}</span>
      </div>
    );
  return (
    <p
      className={cn(
        "size-full overflow-hidden rounded-lg bg-plate-nested p-3 text-[9px] leading-[1.45] whitespace-pre-wrap text-ink-secondary",
        className,
      )}
    >
      {text}
    </p>
  );
}

function Done({ finished, z }: { finished: boolean; z: number }) {
  return (
    <AnimatePresence>
      {finished && (
        <motion.span
          className="absolute -end-2.5 -top-2.5 grid size-7 place-items-center rounded-full bg-success text-canvas"
          style={{ zIndex: z }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            transition: { type: "spring", duration: 0.4, bounce: 0.2 },
          }}
        >
          <Check className="size-4" aria-hidden="true" />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** A number that rolls up to its new value. */
export function RollingCount({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-grid overflow-hidden tabular-nums", className)}>
      <AnimatePresence initial={false}>
        <motion.span
          key={value}
          className="[grid-area:1/1]"
          initial={{ y: "100%" }}
          animate={{ y: 0, transition: { duration: 0.3, ease: EASE } }}
          exit={{ y: "-100%", transition: { duration: 0.3, ease: EASE } }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** A motion value from 0 to 1 and back, running while the lesson is read. */
function useSweep(running: boolean, duration: number) {
  const reduce = useReduceMotion();
  const sweep = useMotionValue(0.5);
  useEffect(() => {
    if (!running || reduce) return;
    sweep.set(0);
    const run = animate(sweep, 1, {
      duration,
      ease: [0.45, 0, 0.55, 1],
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "mirror",
    });
    return () => run.stop();
  }, [running, reduce, sweep, duration]);
  return { sweep, still: reduce || !running };
}

/** How long the old top page stays out to the side before it tucks under. */
const OUT_MS = 380;

/** Where a sheet sits in the pile, by how far it is from the top. */
const POSES = [
  { x: 0, y: 0, rotate: 0, scale: 1 },
  { x: 18, y: 6, rotate: 7, scale: 0.95 },
  { x: -18, y: 8, rotate: -7, scale: 0.92 },
];
const OUT = { x: PAGE_W * 0.7, y: -4, rotate: 9, scale: 0.98 };

/**
 * The lesson under a lamp: a pool of light passes over the top page, and when it moves on, the top
 * page slides out to the side and then tucks under the rest.
 */
export function ScanStage({ pages, text, finished, current }: ScanProps) {
  const reduce = useReduceMotion();
  const { sweep, still } = useSweep(!finished, 3.4);
  const y = useTransform(sweep, (v) => v * PAGE_H - PAGE_H * 0.22);
  // Two plain poses rather than keyframes, so the step's re-renders never restart the motion.
  const previous = useRef(current);
  const [outside, setOutside] = useState(-1);
  useLayoutEffect(() => {
    if (previous.current === current) return;
    setOutside(previous.current);
    previous.current = current;
    const back = setTimeout(() => setOutside(-1), OUT_MS);
    return () => clearTimeout(back);
  }, [current]);

  const sheets = pages.length > 0 ? pages : [null];
  const n = sheets.length;
  return (
    <div className="relative" style={{ width: PAGE_W, height: PAGE_H }}>
      {sheets.map((sheet, i) => {
        const depth = (i - current + n) % n;
        const out = i === outside && !reduce;
        const pose = out ? OUT : (POSES[Math.min(depth, POSES.length - 1)] ?? OUT);
        return (
          <motion.div
            key={sheet?.id ?? "text"}
            className="edge absolute inset-0 rounded-xl bg-plate p-1.5"
            style={{ zIndex: out ? n + 1 : n - depth }}
            initial={false}
            animate={{ ...pose, opacity: depth < POSES.length ? 1 : 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : out
                  ? { duration: OUT_MS / 1000, ease: EASE }
                  : { duration: 0.55, ease: EASE }
            }
          >
            <PageFace page={sheet ?? undefined} text={text} />
          </motion.div>
        );
      })}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-1.5 overflow-hidden rounded-lg"
        style={{ zIndex: n + 2 }}
      >
        <AnimatePresence>
          {!still && (
            <motion.div
              className="absolute inset-x-0 top-0"
              style={{ y, height: PAGE_H * 0.44 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
            >
              <div className="size-full bg-[radial-gradient(75%_50%_at_50%_50%,var(--amber-tint),transparent)]" />
              <div className="absolute inset-x-3 top-1/2 h-px bg-amber/70 shadow-[0_0_10px_2px_var(--lantern-glow)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Done finished={finished} z={n + 3} />
    </div>
  );
}
