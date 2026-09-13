import { clsx } from "clsx";
import type { ReactNode } from "react";

/** On or off, takes effect immediately. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  leading,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode | undefined;
  /** Marker before the label, e.g. the grant dot on the consent screen. */
  leading?: ReactNode | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <label
      className={clsx(
        "flex min-h-11 cursor-pointer items-start justify-between gap-4 py-1 md:min-h-10",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
    >
      {leading}
      <span className="grid flex-1 gap-0.5">
        <span className="text-base font-medium text-text">{label}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          aria-checked={checked}
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden="true"
          className={clsx(
            "block h-[26px] w-[44px] rounded-full transition-colors duration-200",
            "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
            checked ? "bg-text" : "edge-2 bg-plate-2",
          )}
        />
        <span
          aria-hidden="true"
          className={clsx(
            "absolute start-[3px] top-[3px] size-5 rounded-full transition-transform duration-200 ease-out motion-reduce:transition-none",
            checked ? "translate-x-[18px] bg-canvas" : "edge bg-plate",
          )}
        />
      </span>
    </label>
  );
}
