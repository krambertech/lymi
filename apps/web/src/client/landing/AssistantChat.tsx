import { clsx } from "clsx";
import { Check } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * The assistants Lymi's MCP server is set up for, drawn as simple marks so the row reads at a
 * glance. These are our own approximations rather than the official brand assets: replace them
 * with the real files before launch if any of these companies publish usable ones.
 */
const CLIENTS = [
  {
    name: "Claude",
    mark: (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
        <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M10 3.4v13.2M4.34 6.7l11.32 6.6M4.34 13.3l11.32-6.6" />
        </g>
      </svg>
    ),
  },
  {
    name: "ChatGPT",
    mark: (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
        <path
          d="M10 2.6 15.4 5.7v6.3L10 15.1 4.6 12V5.7Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M10 8.85 15.4 5.7M10 8.85v6.25M10 8.85 4.6 5.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    name: "Claude Code",
    mark: (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
        <path
          d="m7.2 6.6-3.4 3.4 3.4 3.4M12.8 6.6l3.4 3.4-3.4 3.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    name: "Cursor",
    mark: (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
        <path
          d="M5 2.8 15.2 9.6l-4.5.7-2 4.1z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

type Turn = { from: "you" | "them"; body: ReactNode };

const CONVERSATION: Turn[] = [
  { from: "you", body: "That chess term you just used, add it to my deck." },
  {
    from: "them",
    body: (
      <>
        <span className="flex items-start gap-1.5">
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-good" />
          <span>Added to Chess, with the meaning and an example.</span>
        </span>
        <span className="mt-2.5 block rounded-sm bg-amber-soft px-3 py-2">
          <span className="block text-2xs tracking-[0.06em] text-amber-text uppercase">
            Chess · new
          </span>
          <span className="mt-1 block text-md font-medium tracking-[-0.024em] text-text">
            zugzwang
          </span>
          <span className="mt-0.5 block text-xs text-text-2">
            Any move you make makes your position worse
          </span>
        </span>
      </>
    ),
  },
  { from: "you", body: "And what am I due to review tonight?" },
  {
    from: "them",
    body: "Seven cards. Four Finnish, two chess terms, one from that signal-processing paper.",
  },
];

const SPRING = { type: "spring", duration: 0.5, bounce: 0.22 } as const;

/**
 * The conversation plays out one message at a time as it scrolls into view, with the pause
 * before a reply that a real assistant takes. The point is what the reader gets to do, not
 * the protocol underneath it, so the clients are named and MCP is a footnote.
 */
export function AssistantChat() {
  const box = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const seen = useInView(box, { amount: 0.35, once: true });
  // The finished conversation is the resting state, so a crawler, a link preview or a
  // background tab reads all of it. It rewinds and plays out only when it scrolls into view,
  // which can only happen on a screen someone is looking at.
  const [shown, setShown] = useState(CONVERSATION.length);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!seen || still) return;
    setShown(0);
    const timers: number[] = [];
    let at = 500;
    CONVERSATION.forEach((turn, i) => {
      if (turn.from === "them") {
        timers.push(window.setTimeout(() => setTyping(true), at));
        at += 900;
      }
      timers.push(
        window.setTimeout(() => {
          setTyping(false);
          setShown(i + 1);
        }, at),
      );
      at += turn.from === "them" ? 1300 : 700;
    });
    return () => timers.forEach(window.clearTimeout);
  }, [seen, still]);

  return (
    <div ref={box}>
      <ul className="mx-auto flex max-w-[460px] flex-wrap justify-center gap-2">
        {CLIENTS.map((c, i) => (
          <motion.li
            key={c.name}
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={seen ? { opacity: 1, y: 0 } : {}}
            transition={still ? { duration: 0 } : { duration: 0.3, delay: 0.06 * i }}
            className="flex items-center gap-1.5 rounded-full bg-plate-2 px-3 py-1.5 text-xs text-text-2 edge"
          >
            <span className="text-amber-text">{c.mark}</span>
            {c.name}
          </motion.li>
        ))}
      </ul>

      <div className="mx-auto mt-8 flex min-h-[330px] max-w-[460px] flex-col gap-3">
        <AnimatePresence initial={false}>
          {CONVERSATION.slice(0, shown).map((turn, i) => (
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: the script is fixed, so the index is the identity
              key={i}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={still ? { duration: 0 } : SPRING}
              className={clsx(
                "px-3.5 py-2.5 text-sm edge",
                turn.from === "you"
                  ? "max-w-[82%] self-end bg-plate-2 text-text"
                  : "max-w-[88%] self-start bg-plate text-text-2",
              )}
              style={{ borderRadius: 14 }}
            >
              {turn.body}
            </motion.div>
          ))}

          {typing && (
            <motion.div
              key="typing"
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={still ? { duration: 0 } : SPRING}
              className="flex w-fit gap-1 self-start bg-plate px-4 py-3 edge"
              style={{ borderRadius: 14 }}
              aria-hidden="true"
            >
              {[0, 1, 2].map((n) => (
                <motion.span
                  key={n}
                  className="size-1.5 rounded-full bg-faint"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, delay: n * 0.16 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
