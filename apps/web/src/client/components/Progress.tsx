import { clsx } from "clsx";

/**
 * The session track. Value is 0 to 1.
 *
 * Eight pixels, on the card's own width, never on the screen edge: a hairline at the top of a
 * phone fights the rounded corners and the status bar, and reads as a rendering fault rather than
 * a thing. The fill is ink rather than amber, because amber belongs to the flame, the one primary
 * action and a due count, and a track that creeps across every card is none of those.
 *
 * The label is announced, not shown.
 */
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
      className={clsx("h-2 w-full overflow-hidden rounded-full bg-edge", className)}
    >
      <i
        className="block h-full w-full origin-left rounded-full bg-text-2 transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  );
}
