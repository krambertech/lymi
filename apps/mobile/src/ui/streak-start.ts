import { useLingui } from "@lingui/react/macro";

/** Said in place of a run of zero, which reads as a failure rather than a start. streak.md. */
export function useStreakStart(longest: number) {
  const { t } = useLingui();
  return longest > 0 ? t`Start a new streak` : t`Start your streak`;
}
