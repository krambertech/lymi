import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { DAILY_GOAL_PRESETS, DailyGoal } from "@lymi/core";
import { clsx } from "clsx";
import { CircleAlert } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";
import { Input } from "./ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

const NAMES: Record<(typeof DAILY_GOAL_PRESETS)[number], MessageDescriptor> = {
  10: msg({ message: "Light", context: "daily goal" }),
  25: msg({ message: "Steady", context: "daily goal" }),
  50: msg({ message: "Keen", context: "daily goal" }),
  100: msg({ message: "Intense", context: "daily goal" }),
};

const CUSTOM = "custom";

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
  const ids = useId();
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

  const row = (choice: string, children: ReactNode) => {
    const id = `${ids}-${choice}`;
    return (
      <label
        htmlFor={id}
        className={clsx(
          "flex min-h-12 cursor-pointer items-center gap-3 rounded-md bg-plate px-3.5",
          "edge transition-[box-shadow,background-color,scale] duration-150 ease-(--ease-out) active:scale-[0.99] motion-reduce:active:scale-100",
          "has-data-checked:edge-2 hoverable:hover:not-has-data-checked:bg-hover",
          "has-[[data-slot=radio-group-item]:focus-visible]:outline-2 has-[[data-slot=radio-group-item]:focus-visible]:outline-offset-2 has-[[data-slot=radio-group-item]:focus-visible]:outline-ring",
        )}
      >
        <RadioGroupItem id={id} value={choice} className="focus-visible:outline-none" />
        {children}
      </label>
    );
  };

  return (
    <div className={clsx("grid gap-2", className)}>
      <RadioGroup<string>
        aria-label={t`Daily goal`}
        value={custom ? CUSTOM : String(value)}
        onValueChange={(choice) => {
          if (choice === CUSTOM) {
            setCustom(true);
            if (draft === "") setDraft(String(value));
            requestAnimationFrame(() => inputRef.current?.select());
            return;
          }
          setCustom(false);
          setError(null);
          onChange(Number(choice));
        }}
      >
        {DAILY_GOAL_PRESETS.map((n) => (
          <div key={n}>
            {row(
              String(n),
              <span className="flex flex-1 items-baseline justify-between gap-3">
                <span className="text-base font-medium text-text">{i18n._(NAMES[n])}</span>
                <span className="text-sm tabular-nums text-text-2">
                  <Plural value={n} one="# review" other="# reviews" />
                </span>
              </span>,
            )}
          </div>
        ))}
        {row(
          CUSTOM,
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
                    // Arrow keys in the number belong to the number, not to the choice around it.
                    e.stopPropagation();
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  className="h-9! w-20 text-end tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <Plural value={Number(draft) || 0} one="review" other="reviews" />
              </span>
            )}
          </span>,
        )}
      </RadioGroup>
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-sm text-danger" role="alert">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
