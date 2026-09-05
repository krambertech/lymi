import { clsx } from "clsx";

/** A thin track. Value is 0 to 1. The label is announced, not shown. */
export function Progress({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string | undefined;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={clsx("h-[3px] w-full overflow-hidden rounded-full bg-edge", className)}
    >
      <i
        className="block h-full w-full origin-left rounded-full bg-amber transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  );
}
