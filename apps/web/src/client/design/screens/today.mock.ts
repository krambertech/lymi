import type { DeckSummary } from "../../lib/api";
import { decks } from "../mock";

export const quietDecks: DeckSummary[] = decks.map((d) => ({ ...d, due: 0 }));

/** Today's rounds on a morning with cards due. */
export const rounds = { forgotten: 3, new: 12, slipping: 5 };

/** Ninety quiet days: nothing reviewed, for the first-run screen. */
export const noHistory: number[] = Array(90).fill(0);
