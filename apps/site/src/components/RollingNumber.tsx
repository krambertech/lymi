import { useLingui } from "@lingui/react/macro";
import { DIGIT_ROLL } from "@lymi/design";
import { clsx } from "clsx";
import { motion, useReducedMotion, useReducedMotionConfig } from "motion/react";
import { useState } from "react";

interface Props {
  value: number;
  /** Off when the change came from the keyboard, which never animates. */
  animate?: boolean | undefined;
  className?: string | undefined;
}

const isDigit = (char: string | undefined) => !!char && /\p{Nd}/u.test(char);

/**
 * A count that rolls digit by digit when it changes in view, like a departure board; a digit that
 * does not change stays still. At rest it is plain text, so it reads as one number. motion.md
 * "Numbers"; the product draws its counts with the same one.
 */
export function RollingNumber({ value, animate = true, className }: Props) {
  const { i18n } = useLingui();
  // The site has no MotionConfig, so the system setting is read directly too.
  const configured = useReducedMotionConfig();
  const system = useReducedMotion();
  const reduce = configured || !!system;
  const [last, setLast] = useState(value);
  const [roll, setRoll] = useState<{ from: string; up: boolean } | null>(null);
  if (last !== value) {
    setLast(value);
    setRoll(animate && !reduce ? { from: i18n.number(last), up: value > last } : null);
  }
  const text = i18n.number(value);
  if (!roll) return <span className={clsx("tabular-nums", className)}>{text}</span>;

  const now = [...text];
  const before = [...roll.from];
  const places = Math.max(now.length, before.length);
  const shift = roll.up ? "100%" : "-100%";
  const away = roll.up ? "-100%" : "100%";
  let settles = true;
  return (
    <span className={clsx("relative inline-flex tabular-nums", className)}>
      <span className="sr-only">{text}</span>
      {Array.from({ length: places }, (_, i) => {
        // Counted from the end, so the ones stay the ones when the number gains a digit.
        const place = places - i;
        const to = now[now.length - place];
        const from = before[before.length - place];
        if (to === from || !(isDigit(to) || isDigit(from))) {
          return (
            <span key={place} aria-hidden="true">
              {to}
            </span>
          );
        }
        // One column says when the roll is over; they all settle on the same spring.
        const finishes = settles;
        settles = false;
        const done = () => setRoll(null);
        return (
          <span
            key={`${place}-${value}`}
            aria-hidden="true"
            className="relative inline-grid overflow-hidden [&>*]:[grid-area:1/1]"
          >
            {from !== undefined && (
              <motion.span
                className="inline-block"
                initial={{ y: 0 }}
                animate={{ y: away }}
                transition={DIGIT_ROLL}
                {...(finishes && to === undefined ? { onAnimationComplete: done } : {})}
              >
                {from}
              </motion.span>
            )}
            {to !== undefined && (
              <motion.span
                className="inline-block"
                initial={{ y: shift }}
                animate={{ y: 0 }}
                transition={DIGIT_ROLL}
                {...(finishes ? { onAnimationComplete: done } : {})}
              >
                {to}
              </motion.span>
            )}
          </span>
        );
      })}
    </span>
  );
}
