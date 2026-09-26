import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import type { CSSProperties } from "react";

interface Props {
  /** Seven counts, oldest first. Today last. */
  days: number[];
  /**
   * "sm" is the inline cut, for the end of a session. "lg" is the week on Today, where the
   * streak is the only thing under the button and has the room to be looked at.
   */
  size?: "sm" | "lg" | undefined;
  /** Each day's own goal, as it was that day. Where there is one, the middle step begins at half of it. */
  goals?: (number | null)[] | undefined;
  /** Which days counted toward a streak. Those are full whatever they held. */
  satisfied?: boolean[] | undefined;
  /** Which days were rest days. Their glass is edged in dashes and still shows what the day held. */
  rest?: boolean[] | undefined;
  /** The learner-local YYYY-MM-DD of each day. Without them the labels count back from the device's today. */
  dates?: string[] | undefined;
  /** At the end of a review the lights switch on one after another, starting this many ms in. */
  sequence?: number | undefined;
  /** Today's light flares once as it fills. */
  flare?: boolean | undefined;
  className?: string | undefined;
}

/** How far apart the lights switch on in a sequence. */
export const LIGHT_STEP_MS = 70;

/**
 * A day's light carries three steps of amber, by how much that day held. A day that counted toward
 * a streak is full, and one measured against a goal reaches the middle step at half of that
 * day's own goal, so lowering today's goal never rewrites how an earlier day looks. Without a goal
 * the reference is
 * the week's own busiest day with a floor under it, so a quiet week is not flattered into looking
 * heavy and one big Tuesday does not wash the rest of the week out.
 *
 * Seven days grade, and so does the Insights day grid, which reuses these steps; the
 * thirty-day strip between them deliberately does not. Over a week a step is the difference
 * between "I turned up" and "I turned up and reviewed everything", which is a thing the
 * learner already knows and likes seeing.
 */
function level(
  n: number,
  reference: number,
  goal?: number | null,
  counted?: boolean,
): 0 | 1 | 2 | 3 {
  if (counted) return 3;
  if (n <= 0) return 0;
  if (goal) return n >= goal ? 3 : n >= goal / 2 ? 2 : 1;
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
export const LIGHT_FILL: Record<1 | 2 | 3, string> = {
  1: "bg-[color-mix(in_oklab,var(--amber)_45%,var(--glass))]",
  2: "bg-[color-mix(in_oklab,var(--amber)_75%,var(--glass))]",
  3: "bg-amber",
};

/**
 * The last seven days as seven lights: the lantern's glass, seen small. Lit when you reviewed
 * that day, and the light climbs the glass and brightens for a fuller day — height and colour
 * carry the same step, so the difference survives without colour. No streak count, no
 * pressure: an unlit day is just an unlit day, and the flame beside it counts the run.
 *
 * One image, one description. The wrapper is atomic to assistive technology, so the per-day
 * counts go into its label rather than into titles nobody can reach from a keyboard.
 */
export function SevenLights({
  days,
  size = "sm",
  goals,
  satisfied,
  rest,
  dates,
  sequence,
  flare = false,
  className,
}: Props) {
  const { t, i18n } = useLingui();
  const today = new Date();
  // A learner-local date is formatted at noon UTC in UTC, so no device zone can move it a day.
  const weekday = new Intl.DateTimeFormat(i18n.locale, {
    weekday: "short",
    ...(dates ? { timeZone: "UTC" } : {}),
  });
  const labels = days.map((_, i) => {
    const date = dates?.[i];
    if (date) return weekday.format(new Date(`${date}T12:00:00Z`));
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
      if (rest?.[i]) return n === 0 ? t`${day} none, rest day` : t`${day} ${n}, rest day`;
      return n === 0 ? t`${day} none` : `${day} ${n}`;
    })
    .join(", ");
  const description = t`Reviewed on ${lit} of the last ${plural(total, { one: "# day", other: "# days" })}: ${perDay}.`;
  return (
    // A span, so the lights can sit inside a button such as the streak card.
    <span
      className={clsx(
        "inline-flex items-end",
        // At most its natural 284px, never spread wider; on a narrow phone the gaps close before the glasses shrink.
        large ? "w-full max-w-71 justify-between gap-1.5 @sm:gap-2.5" : "gap-2",
        className,
      )}
      role="img"
      aria-label={description}
    >
      {days.map((n, i) => {
        const l = level(n, reference, goals?.[i], satisfied?.[i]);
        const isToday = i === days.length - 1;
        const resting = !!rest?.[i];
        const day = labels[i];
        return (
          <span
            key={day}
            className={clsx(
              "flex min-w-0 flex-col items-center",
              large ? "gap-2" : "gap-1.5",
              sequence !== undefined && "light-on",
            )}
            style={
              sequence === undefined
                ? undefined
                : ({ "--at": `${sequence + i * LIGHT_STEP_MS}ms` } as CSSProperties)
            }
            title={t`${day}: ${n} reviewed`}
          >
            {/* The glass is always drawn; the light inside it rises with the day. */}
            <i
              className={clsx(
                "relative block max-w-full overflow-hidden",
                // Tinted like the month's rest band, so the two read as one mark.
                resting
                  ? clsx(
                      "border-dashed border-amber bg-[color-mix(in_oklab,var(--amber)_7%,var(--plate-2))]",
                      large ? "border-2" : "border",
                    )
                  : "edge-inset bg-plate-2",
                large
                  ? "aspect-[8/11] w-8 rounded-[6px_6px_8px_8px]"
                  : "aspect-[13/18] w-[13px] rounded-[4px_4px_5px_5px]",
                isToday && l === 0 && "edge-2",
                isToday && flare && l === 3 && "light-flare",
              )}
            >
              {/* Drawn empty too, so a day that lights up while on screen rises from the bottom. */}
              <i
                className={clsx(
                  "absolute inset-0 block origin-bottom transition-[scale,background-color] motion-reduce:transition-none",
                  flare ? "duration-700 ease-out" : "duration-300",
                  LIGHT_FILL[l === 0 ? 1 : l],
                )}
                // How far up the glass the light reaches: the non-colour half of the signal.
                style={{ scale: `1 ${l / 3}` }}
              />
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
    </span>
  );
}
