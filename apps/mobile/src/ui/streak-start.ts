import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";

/**
 * Said in place of a run of zero, which reads as a failure rather than a start. Given the reviews
 * still to go today, it asks for them. streak.md.
 */
export function useStreakStart(longest: number, left?: number | null) {
  const { t } = useLingui();
  if (left)
    return longest > 0
      ? t`${plural(left, { one: "Review # more to start a new streak", other: "Review # more to start a new streak" })}`
      : t`${plural(left, { one: "Review # more to start your streak", other: "Review # more to start your streak" })}`;
  return longest > 0 ? t`Start a new streak` : t`Start your streak`;
}
