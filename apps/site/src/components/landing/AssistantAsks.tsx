import { motion } from "motion/react";
import type { ReactNode } from "react";
import { AssistantMark, type AssistantName } from "./AssistantMarks";
import { EASE } from "./playback";
import { Showcase, useShowcaseStage } from "./Showcase";

export interface Ask {
  id: string;
  icon: ReactNode;
  /** What it is for, in a few words: the item's name in the list. */
  use: ReactNode;
  /** The use case in a sentence or two, open while the item plays. */
  body: ReactNode;
  /** What the learner sends with the request: a photo, a file, a post. */
  attachment?: ReactNode;
  ask: ReactNode;
  /** What came back from Lymi. Only what the tools really do. */
  result: ReactNode;
}

interface Props {
  assistant: AssistantName;
  hue: number;
  /** The list's name for screen readers. */
  label: string;
  asks: readonly Ask[];
}

/** One exchange on the stage: what was sent, the request, and what came back. */
function Exchange({ assistant, item }: { assistant: AssistantName; item: Ask }) {
  const { playing, still } = useShowcaseStage();
  const shown = still || playing;
  const step = (delay: number) => ({
    initial: still ? false : { opacity: 0, y: 10, filter: "blur(6px)" },
    animate: shown
      ? { opacity: 1, y: 0, filter: "blur(0px)" }
      : { opacity: 0, y: 10, filter: "blur(6px)" },
    transition: { duration: 0.45, ease: EASE, delay: still ? 0 : delay },
  });
  const lead = item.attachment ? 0.5 : 0;
  return (
    <div className="flex w-full max-w-[420px] flex-col gap-3">
      <div className="flex flex-col items-end gap-2">
        {item.attachment && <motion.div {...step(0.15)}>{item.attachment}</motion.div>}
        <motion.p
          {...step(0.15 + lead)}
          className="ms-10 w-fit max-w-[85%] rounded-2xl rounded-ee-md bg-ink px-4 py-2.5 text-md text-pretty text-canvas"
        >
          {item.ask}
        </motion.p>
      </div>
      <div className="flex items-start gap-2.5">
        <motion.span
          {...step(0.8 + lead)}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-plate edge-drop [&_svg]:size-4"
        >
          <AssistantMark name={assistant} />
        </motion.span>
        <motion.div {...step(1.15 + lead)} className="min-w-0 flex-1">
          {item.result}
        </motion.div>
      </div>
    </div>
  );
}

/** Things to ask this assistant, as timed slides with the exchange on the stage. */
export function AssistantAsks({ assistant, hue, label, asks }: Props) {
  return (
    <Showcase label={label} className="mt-12 @4xl:mt-14">
      {asks.map((item) => (
        <Showcase.Item
          key={item.id}
          id={item.id}
          icon={item.icon}
          title={item.use}
          description={item.body}
          hue={hue}
        >
          <Exchange assistant={assistant} item={item} />
        </Showcase.Item>
      ))}
    </Showcase>
  );
}
