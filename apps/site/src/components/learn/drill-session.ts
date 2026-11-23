import { useLingui } from "@lingui/react/macro";
import { useReducer } from "react";
import { type DrillSession, type DrillSessionEvent, sessionReducer } from "../../lib/learn/drill";
import { type DrillSource, loadSources, type Question } from "./drill-banks";

export type Session = DrillSession<DrillSource, Question>;

const IDLE: Session = { status: "idle", failed: false };

export function useDrillSession(
  lessons: () => Iterable<string>,
  draw: (sources: readonly DrillSource[]) => readonly Question[],
) {
  const { i18n } = useLingui();
  const [session, dispatch] = useReducer(
    (state: Session, event: DrillSessionEvent<DrillSource, Question>) =>
      sessionReducer(state, event),
    IDLE,
  );
  const open = () => {
    dispatch({ type: "asked" });
    loadSources(lessons(), i18n.locale).then(
      (sources) => dispatch({ type: "loaded", sources, questions: draw(sources) }),
      () => dispatch({ type: "failed" }),
    );
  };
  const more = () => {
    if (session.status === "open") dispatch({ type: "more", questions: draw(session.sources) });
  };
  return { session, open, more, close: () => dispatch({ type: "closed" }) };
}
