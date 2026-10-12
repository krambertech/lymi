import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { DeckRow } from "@lymi/client/deck-list";

const DAY = 86_400_000;

/** "tomorrow", "in 3 days": when a deck's next card comes back. Hermes has no RelativeTimeFormat. */
export function useNextDue(rows: readonly DeckRow[] | undefined) {
  const { t } = useLingui();
  const now = Date.now();
  let next = Number.POSITIVE_INFINITY;
  for (const { state } of rows ?? []) {
    const at = state ? new Date(state.due).getTime() : Number.NaN;
    if (at > now && at < next) next = at;
  }
  if (!Number.isFinite(next)) return null;
  const hours = Math.max(1, Math.round((next - now) / 3_600_000));
  const days = Math.round((next - now) / DAY);
  if (days < 1) return plural(hours, { one: "in # hour", other: "in # hours" });
  if (days === 1) return t`tomorrow`;
  if (days < 30) return plural(days, { one: "in # day", other: "in # days" });
  return plural(Math.round(days / 30), { one: "in # month", other: "in # months" });
}
