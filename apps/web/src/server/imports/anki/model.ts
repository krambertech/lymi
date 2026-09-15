/** What the Anki reader and the Anki writer agree on about a collection's encoding. */

export const ANKI_DAY_SECONDS = 86_400;

/** Anki joins note fields, and schema 18 joins deck path parts, with the unit separator. */
export const ANKI_SEPARATOR = String.fromCharCode(0x1f);

/** A review card's `due`: days since the collection's creation time `crt`, in seconds. */
export function ankiDayNumber(ms: number, crt: number): number {
  return Math.floor((ms / 1000 - crt) / ANKI_DAY_SECONDS);
}

/**
 * A card's due moment in ms from Anki's `due` and card type: null for a new card, whose `due` is
 * a position; a Unix time in seconds for a learning step; otherwise a day number from `crt`.
 */
export function ankiDueMoment(type: number, due: number, crt: number): number | null {
  if (type === 0) return null;
  return due > 1_000_000_000 ? due * 1000 : (crt + due * ANKI_DAY_SECONDS) * 1000;
}
