import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, LoaderCircle } from "lucide-react";
import { motion, useInView } from "motion/react";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Lantern } from "../Lantern";
import { AssistantMark, type AssistantName } from "./AssistantMarks";
import { appear, EASE, usePlayback, useStill } from "./playback";

export interface MadeCard {
  label: string;
  term: string;
  meaning: string;
}

interface Props {
  assistant: AssistantName;
  /** The tray's hue: the assistant's colour on the page. */
  hue: number;
  /** What the learner sends with the ask: a photo, a file, a link. */
  attachment: ReactNode;
  ask: ReactNode;
  reply: ReactNode;
  cards: readonly MadeCard[];
  /** The language the card terms are in, for screen readers and fonts. */
  lang: string;
  /** The whole exchange in words, since the demo itself is hidden from screen readers. */
  label: string;
}

export type Backdrop = "tray" | "spotlight" | "bare";

/** Classes for a demo's ground, padded the same way on all three. */
export const BACKDROPS: Record<Backdrop, string> = {
  tray: "use-case-tile rounded-[28px] p-5 @2xl:p-7",
  spotlight: "assistant-spotlight p-5 @2xl:p-7",
  bare: "p-5 @2xl:p-7",
};

/** The ground every demo on an assistant's page sits on. */
export const BackdropContext = createContext<Backdrop>("spotlight");

/**
 * While the ground is being chosen, `?hero=tray|spotlight|bare` switches it on a local dev server.
 * A built page always shows the spotlight.
 */
export function useBackdropPreview(): Backdrop {
  const [backdrop, setBackdrop] = useState<Backdrop>("spotlight");
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const asked = new URLSearchParams(window.location.search).get("hero");
    if (asked === "tray" || asked === "spotlight" || asked === "bare") setBackdrop(asked);
  }, []);
  return backdrop;
}

/** When each beat lands, in ms. It plays once, the first time it is on screen. */
const BEATS = { attach: 250, ask: 850, calling: 1700, called: 3100, reply: 3500, cards: 4000 };

/**
 * One exchange with the assistant on its own tray: something sent with an ask, the assistant
 * using Lymi, its reply, and the cards that landed. Bubbles sit on the tray; only cards are white.
 */
export function AssistantChatDemo({
  assistant,
  hue,
  attachment,
  ask,
  reply,
  cards,
  lang,
  label,
}: Props) {
  // The assistant's tray, a soft pool of its colour, or the page itself.
  const backdrop = useContext(BackdropContext);
  const still = useStill();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const { at } = usePlayback(BEATS, inView, still);
  const move = { duration: still ? 0 : 0.5, ease: EASE };

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      style={{ "--tray-h": hue } as CSSProperties}
      className={clsx("mx-auto flex w-full max-w-[480px] flex-col gap-4", BACKDROPS[backdrop])}
    >
      <div className="flex flex-col items-end gap-2">
        <motion.div initial={false} animate={appear(at("attach"))} transition={move}>
          {attachment}
        </motion.div>
        <motion.p
          className="max-w-[85%] rounded-2xl rounded-ee-md bg-ink px-4 py-2.5 text-md text-pretty text-canvas"
          initial={false}
          animate={appear(at("ask"))}
          transition={move}
        >
          {ask}
        </motion.p>
      </div>

      <div className="flex items-start gap-2.5">
        {/* The assistant arrives with its turn, not before the learner has asked anything. */}
        <motion.span
          className="grid size-8 shrink-0 place-items-center rounded-full bg-plate edge-drop [&_svg]:size-4"
          initial={false}
          animate={appear(at("calling"))}
          transition={move}
        >
          <AssistantMark name={assistant} />
        </motion.span>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2 pt-0.5">
          <motion.p
            className="flex h-8 items-center gap-2 rounded-full bg-plate ps-1 pe-3 text-sm text-ink-secondary edge"
            initial={false}
            animate={appear(at("calling"))}
            transition={move}
          >
            <span className="grid size-6 place-items-center rounded-full bg-plate-nested">
              <Lantern className="size-4" />
            </span>
            {at("called") ? (
              <>
                <Trans>Used Lymi</Trans>
                <Check aria-hidden="true" className="size-4 text-success" />
              </>
            ) : (
              <>
                <Trans>Using Lymi</Trans>
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-ink-muted" />
              </>
            )}
          </motion.p>
          <motion.p
            className="text-md text-pretty text-ink"
            initial={false}
            animate={appear(at("reply"))}
            transition={move}
          >
            {reply}
          </motion.p>
          <ul className="mt-1 grid w-full grid-cols-2 gap-2">
            {cards.map((card, i) => (
              <motion.li
                key={card.term}
                className="min-w-0 rounded-xl bg-plate px-3 pt-2 pb-2.5 edge-drop"
                initial={false}
                animate={
                  at("cards")
                    ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
                    : { opacity: 0, y: 14, scale: 0.96, filter: "blur(6px)" }
                }
                transition={{ ...move, delay: still || !at("cards") ? 0 : i * 0.12 }}
              >
                <p className="truncate text-2xs text-ink-muted">{card.label}</p>
                <p
                  lang={lang}
                  className="mt-0.5 truncate text-md font-medium tracking-[-0.015em] text-ink"
                >
                  {card.term}
                </p>
                <p className="truncate text-xs text-ink-secondary">{card.meaning}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
