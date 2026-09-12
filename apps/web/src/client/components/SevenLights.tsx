import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";

interface Props {
  /** Seven counts, oldest first. Today last. */
  days: number[];
  /**
   * "sm" is the inline cut, for the end of a session. "lg" is the week on Today, where the
   * streak is the only thing under the button and has the room to be looked at.
   */
  size?: "sm" | "lg" | undefined;
  className?: string | undefined;
}

/**
 * A day's light carries three steps of amber, by how much that day held. The reference is the
 * week's own busiest day with a floor under it, so a quiet week is not flattered into looking
 * heavy and one big Tuesday does not wash the rest of the week out.
 *
 * Seven days grade; the thirty-day strip in Insights deliberately does not. Over a month,
 * shading by volume makes a habit picture into a scoreboard and rewards one heavy day over a
 * steady stretch. Over a week it is the difference between "I turned up" and "I turned up and
 * did the lot", which is a thing the learner already knows and likes seeing.
 */
function level(n: number, reference: number): 0 | 1 | 2 | 3 {
  if (n <= 0) return 0;
  const share = n / reference;
  if (share >= 0.67) return 3;
  if (share >= 0.34) return 2;
  return 1;
}

/**
 * The steps run from the lantern's glass to its flame, which is what a light does as it comes
 * up. Mixing toward `--glass` rather than toward transparency or the plate keeps the chroma:
 * a translucent amber lands on whatever is behind it, and in the dark room that is the same
 * lightness as an unlit day, so "a little" and "nothing" become one picture. Mixing toward the
 * neutral plate separates them but turns the low step to mud.
 */
const FILL: Record<1 | 2 | 3, string> = {
  1: "bg-[color-mix(in_oklab,var(--amber)_45%,var(--glass))]",
  2: "bg-[color-mix(in_oklab,var(--amber)_75%,var(--glass))]",
  3: "bg-amber",
};

/** How far up the glass the light reaches. The non-colour half of the signal. */
const HEIGHT: Record<1 | 2 | 3, string> = { 1: "h-1/3", 2: "h-2/3", 3: "h-full" };

/**
 * The last seven days as seven lights: the lantern's glass, seen small. Lit when you reviewed
 * that day, and the light climbs the glass and brightens for a fuller day — height and colour
 * carry the same step, so the difference survives without colour. No streak count, no
 * pressure: an unlit day is just an unlit day, and the flame beside it counts the run.
 *
 * One image, one description. The wrapper is atomic to assistive technology, so the per-day
 * counts go into its label rather than into titles nobody can reach from a keyboard.
 */
export function SevenLights({ days, size = "sm", className }: Props) {
  const { t, i18n } = useLingui();
  const today = new Date();
  const weekday = new Intl.DateTimeFormat(i18n.locale, { weekday: "short" });
  const labels = days.map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days.length - 1 - i));
    return weekday.format(d);
  });
  const lit = days.filter((n) => n > 0).length;
  const total = days.length;
  // A floor under the reference, so a week of two-card days does not read as a full week.
  const reference = Math.max(...days, 10);
  const large = size === "lg";
  const perDay = days
    .map((n, i) => {
      const day = labels[i];
      return n === 0 ? t`${day} none` : `${day} ${n}`;
    })
    .join(", ");
  const description = t`Reviewed on ${lit} of the last ${plural(total, { one: "# day", other: "# days" })}: ${perDay}.`;
  return (
    <div
      className={clsx("inline-flex items-end", large ? "gap-2.5" : "gap-2", className)}
      role="img"
      aria-label={description}
    >
      {days.map((n, i) => {
        const l = level(n, reference);
        const isToday = i === days.length - 1;
        const day = labels[i];
        return (
          <span
            key={day}
            className={clsx("grid justify-items-center", large ? "gap-2" : "gap-1.5")}
            title={t`${day}: ${n} reviewed`}
          >
            {/* The glass is always drawn; the light inside it rises with the day. */}
            <i
              className={clsx(
                "relative block overflow-hidden edge-inset bg-plate-2",
                large
                  ? "h-11 w-8 rounded-[6px_6px_8px_8px]"
                  : "h-[18px] w-[13px] rounded-[4px_4px_5px_5px]",
                isToday && l === 0 && "edge-2",
              )}
            >
              {l !== 0 && (
                <i
                  className={clsx(
                    "absolute inset-x-0 bottom-0 block transition-[height,background-color] duration-300",
                    HEIGHT[l],
                    FILL[l],
                  )}
                />
              )}
            </i>
            <span
              className={clsx(
                "tabular-nums",
                large ? "text-xs" : "text-2xs",
                isToday ? "font-medium text-text-2" : "text-faint",
              )}
            >
              {day?.[0]}
            </span>
          </span>
        );
      })}
    </div>
  );
}
