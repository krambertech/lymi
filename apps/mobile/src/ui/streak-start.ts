import { useLingui } from "@lingui/react/macro";

export function useStreakStart(longest: number) {
  const { t } = useLingui();
  return longest > 0 ? t`Start a new streak` : t`Start your streak`;
}
