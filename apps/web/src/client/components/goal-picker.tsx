import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { DAILY_GOAL_PRESETS, DailyGoal } from "@lymi/core";
import { clsx } from "clsx";
import { CircleAlert } from "lucide-react";
import { useId, useRef, useState } from "react";
import { RadioCard } from "./radio-card";
import { Input } from "./ui/input";
import { RadioGroup } from "./ui/radio-group";

const NAMES: Record<(typeof DAILY_GOAL_PRESETS)[number], MessageDescriptor> = {
  10: msg({ message: "Light", context: "daily goal" }),
  25: msg({ message: "Steady", context: "daily goal" }),
  50: msg({ message: "Keen", context: "daily goal" }),
  100: msg({ message: "Intense", context: "daily goal" }),
};

const CUSTOM = "custom";

// One line per row, the dot centred on it.
const row = "min-h-12 items-center py-0";

const isPreset = (n: number) => (DAILY_GOAL_PRESETS as readonly number[]).includes(n);

interface Props {
  value: number;
  onValueChange: (goal: number) => void;
  className?: string | undefined;
}

/**
 * How many reviews keep the streak each day: four presets and a number of your own. A choice is made when
 * it is made, and the custom number commits on blur or Enter, so there is no Save button.
 */
export function GoalPicker({ value, onValueChange, className }: Props) {
  const { t, i18n } = useLingui();
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
    if (parsed.data !== value) onValueChange(parsed.data);
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
          onValueChange(Number(choice));
        }}
      >
        {DAILY_GOAL_PRESETS.map((n) => (
          <div key={n}>
            <RadioCard value={String(n)} className={row}>
              <span className="flex flex-1 items-baseline justify-between gap-3">
                <span className="text-base font-medium text-text">{i18n._(NAMES[n])}</span>
                <span className="text-sm tabular-nums text-text-2">
                  <Plural value={n} one="# review" other="# reviews" />
                </span>
              </span>
            </RadioCard>
          </div>
        ))}
        <RadioCard value={CUSTOM} className={row}>
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
          </span>
        </RadioCard>
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
