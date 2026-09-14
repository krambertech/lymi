import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { DAILY_GOAL_PRESETS, DailyGoal } from "@lymi/core";
import { clsx } from "clsx";
import { CircleAlert } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";
import { Input } from "./ui/input";

const NAMES: Record<(typeof DAILY_GOAL_PRESETS)[number], MessageDescriptor> = {
  10: msg({ message: "Light", context: "daily goal" }),
  25: msg({ message: "Steady", context: "daily goal" }),
  50: msg({ message: "Keen", context: "daily goal" }),
  100: msg({ message: "Intense", context: "daily goal" }),
};

const isPreset = (n: number) => (DAILY_GOAL_PRESETS as readonly number[]).includes(n);

interface Props {
  value: number;
  onChange: (goal: number) => void;
  className?: string | undefined;
}

/**
 * How many reviews keep the streak each day: four presets and a number of your own. A choice is made when
 * it is made, and the custom number commits on blur or Enter, so there is no Save button.
 */
export function GoalPicker({ value, onChange, className }: Props) {
  const { t, i18n } = useLingui();
  const name = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [custom, setCustom] = useState(!isPreset(value));
  const [draft, setDraft] = useState(isPreset(value) ? "" : String(value));
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    if (draft.trim() === "") {
      setError(null);
      return;
    }
    const parsed = DailyGoal.safeParse(Number(draft));
    if (!parsed.success) {
      // Written here rather than taken from the schema, so it is in the learner's language.
      setError(t`Choose a whole number from 1 to 200.`);
      return;
    }
    setError(null);
    if (parsed.data !== value) onChange(parsed.data);
  };

  const row = (on: boolean, input: ReactNode, children: ReactNode) => (
    // biome-ignore lint/a11y/noLabelWithoutControl: the radio is passed in as `input`.
    <label
      className={clsx(
        "flex min-h-12 cursor-pointer items-center gap-3 rounded-md bg-plate px-3.5",
        "transition-[box-shadow,background-color,scale] duration-150 active:scale-[0.99]",
        "has-[input[type=radio]:focus-visible]:outline-2 has-[input[type=radio]:focus-visible]:outline-offset-2 has-[input[type=radio]:focus-visible]:outline-ring",
        on ? "edge-2" : "edge hoverable:hover:bg-hover",
      )}
    >
      {input}
      <span
        aria-hidden="true"
        className={clsx(
          "grid size-[18px] shrink-0 place-items-center rounded-full transition-[box-shadow] duration-150",
          on ? "shadow-[0_0_0_1px_var(--text)]" : "edge-2",
        )}
      >
        <span
          className={clsx(
            "size-2.5 rounded-full bg-text transition-[scale,opacity] duration-150 motion-reduce:transition-none",
            on ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
      </span>
      {children}
    </label>
  );

  return (
    <fieldset className={clsx("grid gap-2", className)}>
      <legend className="sr-only">
        <Trans>Daily goal</Trans>
      </legend>
      {DAILY_GOAL_PRESETS.map((n) => {
        const on = !custom && value === n;
        return (
          <div key={n}>
            {row(
              on,
              <input
                type="radio"
                name={name}
                checked={on}
                onChange={() => {
                  setCustom(false);
                  setError(null);
                  onChange(n);
                }}
                className="sr-only"
              />,
              <span className="flex flex-1 items-baseline justify-between gap-3">
                <span className="text-base font-medium text-text">{i18n._(NAMES[n])}</span>
                <span className="text-sm tabular-nums text-text-2">
                  <Plural value={n} one="# review" other="# reviews" />
                </span>
              </span>,
            )}
          </div>
        );
      })}
      {row(
        custom,
        <input
          type="radio"
          name={name}
          checked={custom}
          onChange={() => {
            setCustom(true);
            if (draft === "") setDraft(String(value));
            requestAnimationFrame(() => inputRef.current?.select());
          }}
          className="sr-only"
        />,
        <span className="flex min-h-12 flex-1 items-center justify-between gap-3">
          <span className="text-base font-medium text-text">
            <Trans>Custom</Trans>
          </span>
          {custom && (
            <span className="enter-fade flex items-center gap-2 text-sm text-text-2">
              <Input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                value={draft}
                aria-label={t`Reviews a day`}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="h-9! w-20 text-end tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <Plural value={Number(draft) || 0} one="review" other="reviews" />
            </span>
          )}
        </span>,
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-sm text-danger" role="alert">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
