import { useLingui } from "@lingui/react/macro";
import { DIGIT_ROLL } from "@lymi/design";
import { clsx } from "clsx";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { useState } from "react";

interface Props {
  value: number;
  /** Off when the change came from the keyboard, which never animates. */
  animate?: boolean | undefined;
  className?: string | undefined;
}

interface Roll {
  up: boolean;
  moving: boolean;
}

const DIGIT = {
  enter: ({ up }: Roll) => ({ y: up ? "100%" : "-100%" }),
  shown: { y: 0 },
  // `custom` reaches the leaving digit, whose own props are from before this change.
  leave: ({ up, moving }: Roll) =>
    moving ? { y: up ? "-100%" : "100%" } : { opacity: 0, transition: { duration: 0 } },
};

/**
 * A count that rolls digit by digit when it changes in view, like a departure board; a digit that
 * does not change stays still. motion.md "Numbers"; the product draws its counts with the same one.
 */
export function RollingNumber({ value, animate = true, className }: Props) {
  const { i18n } = useLingui();
  const reduce = useReducedMotionConfig();
  const [last, setLast] = useState(value);
  const [up, setUp] = useState(true);
  if (last !== value) {
    setLast(value);
    setUp(value > last);
  }
  const roll: Roll = { up, moving: animate && !reduce };
  const chars = [...i18n.number(value)];
  return (
    <span className={clsx("inline-flex tabular-nums", className)}>
      {chars.map((char, i) => {
        // Keyed from the end, so the ones stay the ones when the number gains a digit.
        const place = chars.length - i;
        return (
          <span key={place} className="relative inline-grid overflow-hidden [&>*]:[grid-area:1/1]">
            <AnimatePresence initial={false} custom={roll}>
              <motion.span
                key={char}
                className="inline-block"
                custom={roll}
                variants={DIGIT}
                initial={roll.moving ? "enter" : false}
                animate="shown"
                exit="leave"
                transition={DIGIT_ROLL}
              >
                {char}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}
