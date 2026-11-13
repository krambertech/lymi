import type { I18n } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import type { Reminder } from "@lymi/core";

/** The words of each kind of day. No card text: this shows on a Lock Screen. ADR 0006. */
export function reminderWords(i18n: I18n, { message, count }: Reminder) {
  switch (message) {
    case "to_goal":
      return {
        title: i18n._(
          msg`${plural(count, { one: "# card to today’s goal", other: "# cards to today’s goal" })}`,
        ),
        body: i18n._(msg`Finish if you have a moment.`),
      };
    case "after_rest":
      return {
        title: i18n._(msg`Yesterday was a rest day`),
        body: i18n._(
          msg`${plural(count, {
            one: "Your streak carried on. # card is ready.",
            other: "Your streak carried on. # cards are ready.",
          })}`,
        ),
      };
    case "next_cards":
      return {
        title: i18n._(
          msg`${plural(count, { one: "Your next card is ready", other: "Your next cards are ready" })}`,
        ),
        body: i18n._(
          msg`${plural(count, { one: "# card for today.", other: "# cards for today." })}`,
        ),
      };
    default:
      return {
        title: i18n._(
          msg`${plural(count, { one: "# card is ready", other: "# cards are ready" })}`,
        ),
        body: i18n._(msg`Review whenever you have a moment.`),
      };
  }
}
