import { clsx } from "clsx";

interface Props {
  /** Seven counts, oldest first. Today last. */
  days: number[];
  className?: string | undefined;
}

const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * The last seven days as seven small lights. Lit when you reviewed that day. No number,
 * no streak count, no pressure: an unlit day is just an unlit day.
 */
export function SevenLights({ days, className }: Props) {
  const today = new Date();
  const labels = days.map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days.length - 1 - i));
    return DAY[(d.getDay() + 6) % 7] ?? "";
  });
  const lit = days.filter((n) => n > 0).length;
  return (
    <div
      className={clsx("inline-flex items-end gap-2", className)}
      role="img"
      aria-label={`Reviewed on ${lit} of the last ${days.length} days`}
    >
      {days.map((n, i) => {
        const on = n > 0;
        const isToday = i === days.length - 1;
        return (
          <span
            key={labels[i]}
            className="grid justify-items-center gap-1.5"
            title={`${labels[i]}: ${n} reviewed`}
          >
            <i
              className={clsx(
                "block h-[18px] w-[13px] rounded-[4px_4px_5px_5px] transition-[background-color,box-shadow] duration-300",
                on ? "bg-amber" : "edge bg-plate-2",
                isToday && !on && "edge-2",
              )}
            />
            <span className={clsx("text-2xs tabular-nums", isToday ? "text-text-2" : "text-faint")}>
              {labels[i]?.[0]}
            </span>
          </span>
        );
      })}
    </div>
  );
}
