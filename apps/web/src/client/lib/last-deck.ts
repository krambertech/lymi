import { CREATE_MORE_KEY as CREATE_MORE, LAST_DECK_KEY as KEY } from "./storage-keys";

/** The deck a card was last added to, so the add sheet opened away from a deck starts there. */
export function lastDeckId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function rememberDeck(deckId: string): void {
  try {
    localStorage.setItem(KEY, deckId);
  } catch {}
}

/** Whether adding a card keeps the sheet open for the next one; off until the learner turns it on. */
export function createMoreChosen(): boolean {
  try {
    return localStorage.getItem(CREATE_MORE) === "1";
  } catch {
    return false;
  }
}

export function rememberCreateMore(on: boolean): void {
  try {
    localStorage.setItem(CREATE_MORE, on ? "1" : "0");
  } catch {}
}
