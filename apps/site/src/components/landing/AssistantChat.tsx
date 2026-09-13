import { clsx } from "clsx";
import { Check } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useRef } from "react";

const CLIENTS = ["Claude", "ChatGPT", "Claude Code", "Codex"] as const;

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

/**
 * The conversation plays once as it enters the viewport. Every message already occupies its
 * final space, so the sequence adds meaning without moving the surrounding page.
 */
export function AssistantChat() {
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { once: true, amount: 0.34 });
  const still = useReducedMotion();

  return (
    <div ref={box}>
      <motion.ul
        className="flex max-w-[460px] flex-wrap gap-2"
        aria-label="Supported assistant clients"
        initial={{ opacity: 0 }}
        animate={{ opacity: inView ? 1 : 0 }}
        transition={{ duration: still ? 0.18 : 0.55 }}
      >
        {CLIENTS.map((client) => (
          <li key={client} className="rounded-full bg-plate-2 px-3 py-1.5 text-xs text-text-2 edge">
            {client}
          </li>
        ))}
      </motion.ul>

      <div className="mt-8 flex max-w-[460px] flex-col gap-3">
        {CONVERSATION.map((turn, i) => (
          <motion.div
            // biome-ignore lint/suspicious/noArrayIndexKey: the script is fixed, so the index is the identity
            key={i}
            className={clsx(
              "px-3.5 py-2.5 text-sm edge",
              turn.from === "you"
                ? "max-w-[82%] self-end bg-plate-2 text-text"
                : "max-w-[88%] self-start bg-plate text-text-2",
            )}
            style={{ borderRadius: 14 }}
            initial={still ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : still ? 0 : 10 }}
            transition={{
              duration: still ? 0.18 : 0.58,
              delay: inView ? (still ? 0 : 0.45 + i * 0.82) : 0,
              ease: [0.19, 1, 0.22, 1],
            }}
          >
            {turn.body}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
