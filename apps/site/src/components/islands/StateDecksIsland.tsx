import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { Locale } from "../../lib/routes";
import { type StateDeck, StateDecks } from "../exams/StateDecks";
import { Localized } from "../Localized";

interface Props {
  locale: Locale;
  general: PublicDeckSummary | undefined;
  states: StateDeck[];
}

export default function StateDecksIsland({ locale, general, states }: Props) {
  return (
    <Localized locale={locale}>
      <StateDecks locale={locale} general={general} states={states} />
    </Localized>
  );
}
