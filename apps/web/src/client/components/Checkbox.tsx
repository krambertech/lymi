import { clsx } from "clsx";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <label
      className={clsx(
        "inline-flex min-h-11 cursor-pointer items-center gap-2.5 py-1 text-base text-text md:min-h-10",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
    >
      <span className="relative inline-flex">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden="true"
          className={clsx(
            "grid size-5 place-items-center rounded-[6px] transition-colors duration-150",
            "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
            checked ? "bg-text text-canvas" : "edge-2 bg-plate",
          )}
        >
          <Check
            className={clsx(
              "size-3.5 transition-opacity duration-100",
              checked ? "opacity-100" : "opacity-0",
            )}
            strokeWidth={3}
          />
        </span>
      </span>
      {label}
    </label>
  );
}
