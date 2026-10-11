import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { describeEvent, type WordHistory } from "../views/word-view";
import { cardHistoryQuery } from "./queries";

/** A card's states, reviews and writes as the word view reads them; undefined until fetched. */
export function useWordHistory(cardId: string | null | undefined): WordHistory | undefined {
  const { i18n } = useLingui();
  const history = useQuery({ ...cardHistoryQuery(cardId ?? ""), enabled: !!cardId });
  return useMemo(
    () =>
      history.data && {
        states: history.data.states,
        reviews: history.data.reviews,
        events: history.data.events.map((e) => describeEvent(e, i18n)),
      },
    [history.data, i18n],
  );
}
