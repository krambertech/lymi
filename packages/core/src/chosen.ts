import { State } from "ts-fsrs";
import { type DrawCard, type DrawLogEntry, type Drawn, drawKey } from "./draw";

/**
 * Reviewing cards the learner chose: each started card not yet reviewed today, once, in its mode
 * due soonest, so due cards come first and the rest follow in the order they would fall due.
 */
export function chosenOrder(
  cards: readonly DrawCard[],
  log: readonly DrawLogEntry[],
  chosen: ReadonlySet<string>,
): Drawn[] {
  const reviewed = new Set(log.map((entry) => entry.cardId));
  const picked = cards.flatMap((card) => {
    if (!chosen.has(card.cardId) || reviewed.has(card.cardId)) return [];
    const [mode] = card.modes
      .filter((m) => m.hasCue && m.state !== State.New)
      .sort((a, b) => a.due.getTime() - b.due.getTime());
    return mode ? [{ cardId: card.cardId, mode }] : [];
  });
  picked.sort(
    (a, b) =>
      a.mode.due.getTime() - b.mode.due.getTime() ||
      drawKey(a.cardId, a.mode.mode).localeCompare(drawKey(b.cardId, b.mode.mode)),
  );
  return picked.map(({ cardId, mode }) => ({ cardId, mode: mode.mode, kind: "review" }));
}

/** The most cards one review of chosen cards takes, as many as a queue serves at once. */
export const CHOSEN_LIMIT = 200;
