import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, LoaderCircle } from "lucide-react";
import { type HTMLMotionProps, motion } from "motion/react";
import type { ReactNode } from "react";
import { Lantern } from "../Lantern";
import { AssistantMark, type AssistantName } from "./AssistantMarks";

/** Motion props for a piece of a scripted chat, so each can arrive on its own beat. */
type Beat<Tag extends "p" | "span"> = Omit<HTMLMotionProps<Tag>, "className" | "children">;

/**
 * What the learner types to an assistant: ink on the page, at the end of the row, as every chat
 * app sets the person holding the phone.
 */
export function LearnerBubble({ children, ...beat }: Beat<"p"> & { children: ReactNode }) {
  return (
    <motion.p
      {...beat}
      className="w-fit max-w-[85%] self-end rounded-2xl rounded-ee-md bg-ink px-4 py-2.5 text-md text-pretty text-canvas"
    >
      {children}
    </motion.p>
  );
}

/** The assistant's mark beside its turn. */
export function AssistantAvatar({ name, ...beat }: Beat<"span"> & { name: AssistantName }) {
  return (
    <motion.span
      {...beat}
      className="grid size-8 shrink-0 place-items-center rounded-full bg-plate edge-drop [&_svg]:size-4"
    >
      <AssistantMark name={name} />
    </motion.span>
  );
}

interface ToolCallProps extends Beat<"p"> {
  /**
   * "tray" sits on a coloured tray or the page and brings its own plate; "plate" sits inside a
   * chat window that is already one, so it steps a level deeper.
   */
  on?: "tray" | "plate" | undefined;
  children: ReactNode;
}

/** The line an assistant shows when it calls Lymi, with the lantern as the tool's icon. */
export function ToolCall({ on = "tray", children, ...beat }: ToolCallProps) {
  return (
    <motion.p
      {...beat}
      className={clsx(
        "flex h-8 w-fit items-center gap-2 self-start rounded-full ps-1 pe-3 text-sm text-ink-secondary",
        on === "tray" ? "bg-plate edge" : "bg-plate-nested",
      )}
    >
      <span
        className={clsx(
          "grid size-6 place-items-center rounded-full",
          on === "tray" ? "bg-plate-nested" : "bg-plate",
        )}
      >
        <Lantern className="size-4" />
      </span>
      {children}
    </motion.p>
  );
}

/** A call to Lymi underway, then done. */
export function UsingLymi({ done }: { done: boolean }) {
  return done ? (
    <>
      <Trans>Used Lymi</Trans>
      <Check aria-hidden="true" className="size-4 text-success" />
    </>
  ) : (
    <>
      <Trans>Using Lymi</Trans>
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-ink-muted" />
    </>
  );
}
