import { clsx } from "clsx";
import type { ReactNode } from "react";

interface Props {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: ReactNode;
  description: ReactNode;
  /** Drawn inside a container that carries the edge, so the row adds none of its own. */
  bare?: boolean | undefined;
  disabled?: boolean | undefined;
}

/**
 * One row of a settings choice. Selection is carried by the edge and the dot: amber stays on
 * the flame and the one primary action.
 */
export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  bare,
  disabled,
}: Props) {
  return (
    <label
      className={clsx(
        "flex cursor-pointer items-start gap-3 rounded-md p-3.5",
        "transition-[box-shadow,background-color,scale] duration-150 active:scale-[0.99]",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
        !bare && "bg-plate",
        !bare && (checked ? "edge-2" : "edge hoverable:hover:bg-hover"),
        bare && !checked && "hoverable:hover:bg-hover",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={clsx(
          "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full transition-[box-shadow] duration-150",
          checked ? "shadow-[0_0_0_1px_var(--text)]" : "edge-2",
        )}
      >
        <span
          className={clsx(
            "size-2.5 rounded-full bg-text transition-[scale,opacity] duration-150 motion-reduce:transition-none",
            checked ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
      </span>
      <span className="grid gap-0.5">
        <span className="text-base font-medium text-text">{title}</span>
        <span className="text-sm text-text-2">{description}</span>
      </span>
    </label>
  );
}
