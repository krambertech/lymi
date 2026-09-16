import { Trans, useLingui } from "@lingui/react/macro";
import { type PasswordStrength, passwordStrength } from "@lymi/core";
import { clsx } from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { useField, useFieldControl } from "./ui/field";
import { controlBase, controlSize } from "./ui/input";

interface Props {
  value: string;
  onValueChange: (value: string) => void;
  /** `new-password` while choosing one, `current-password` while signing in. */
  autoComplete: "new-password" | "current-password";
  /** Shown under the box while the learner is choosing a password. */
  meter?: boolean | undefined;
  /** The address the password protects, so the meter can refuse one built from it. */
  email?: string | undefined;
  name?: string | undefined;
}

/**
 * The password box. It carries its own reveal, because a password chosen blind is a password
 * mistyped, and a strength reading where one is being chosen. The reveal is a button rather
 * than a checkbox so it never submits, and it says which state it will move to.
 */
export function PasswordField({
  value,
  onValueChange,
  autoComplete,
  meter = false,
  email,
  name = "password",
}: Props) {
  const { t } = useLingui();
  const [shown, setShown] = useState(false);
  const field = useField();
  const meterId = useId();
  // The Field supplies its own description and error; the meter joins them rather than
  // replacing them, so a screen reader hears both.
  const control = useFieldControl({});
  const Icon = shown ? EyeOff : Eye;
  const describedBy = [control["aria-describedby"], meter && value ? meterId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className="relative">
        <input
          type={shown ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          disabled={field?.disabled}
          className={clsx(controlBase, controlSize, "ps-3.5 pe-12")}
          {...control}
          aria-describedby={describedBy || undefined}
        />
        <button
          type="button"
          onClick={() => setShown((was) => !was)}
          // The box is 44 px on a phone, and this reaches the whole of its end edge.
          className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-e-md text-muted transition-colors duration-150 hoverable:hover:text-text-2"
          aria-pressed={shown}
          aria-label={shown ? t`Hide password` : t`Show password`}
        >
          <Icon aria-hidden="true" strokeWidth={1.75} className="size-[18px]" />
        </button>
      </div>
      {meter && value.length > 0 && (
        <StrengthMeter id={meterId} strength={passwordStrength(value, email)} />
      )}
    </>
  );
}

const LABELS: Record<PasswordStrength, ReactNode> = {
  weak: <Trans context="Password strength">Weak</Trans>,
  fair: <Trans context="Password strength">Fair</Trans>,
  strong: <Trans context="Password strength">Strong</Trans>,
};

const STEPS: Record<PasswordStrength, number> = { weak: 1, fair: 2, strong: 3 };

/**
 * Three steps rather than a score, because a number nobody can act on is decoration. The
 * reading is text as well as bars, so it does not rest on colour alone.
 */
function StrengthMeter({ id, strength }: { id: string; strength: PasswordStrength }) {
  const filled = STEPS[strength];
  return (
    <div id={id} className="flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={clsx(
              "h-1 flex-1 rounded-full transition-colors duration-150",
              step > filled
                ? "bg-plate-2"
                : strength === "weak"
                  ? "bg-danger"
                  : strength === "fair"
                    ? "bg-muted"
                    : "bg-good",
            )}
          />
        ))}
      </div>
      <span
        className={clsx(
          "text-xs",
          strength === "weak" ? "text-danger" : strength === "strong" ? "text-good" : "text-muted",
        )}
      >
        {LABELS[strength]}
      </span>
    </div>
  );
}
