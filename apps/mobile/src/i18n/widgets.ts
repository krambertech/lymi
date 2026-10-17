import type { I18n } from "@lingui/core";
import { plural, t } from "@lingui/core/macro";
import type { Snapshot } from "../widgets/next-day";

export type WidgetText = ReturnType<typeof widgetText>;

// Only plain strings cross into the widget runtime, which cannot load the app's catalogs.
export function widgetText(i18n: I18n, { due, streak, left, signedIn }: Snapshot) {
  return {
    dueCount: i18n.number(due),
    dueLabel: t(i18n)({ message: plural(due, { one: "card due", other: "cards due" }) }),
    dueShort: t(i18n)`due`,
    dueLine: t(i18n)({ message: plural(due, { one: "# card due", other: "# cards due" }) }),
    streakCount: i18n.number(streak),
    streakLabel: t(i18n)({
      message: plural(streak, { one: "day in a row", other: "days in a row" }),
    }),
    streakLine: t(i18n)({
      message: plural(streak, { one: "# day in a row", other: "# days in a row" }),
    }),
    inline: t(
      i18n,
    )`${plural(due, { one: "# card due", other: "# cards due" })} · ${plural(streak, { one: "# day", other: "# days" })}`,
    today: !signedIn
      ? ""
      : left === 0
        ? t(i18n)`Today counts`
        : t(i18n)`${plural(left, { one: "# review", other: "# reviews" })} to today’s goal`,
  };
}
