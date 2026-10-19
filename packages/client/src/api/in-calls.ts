import { CARD_BATCH_LIMIT } from "@lymi/core";

/** A card a call never reached, in the shape every bulk card outcome shares, so it can be sent again. */
type Unsent = { id: string; status: "error"; code: "unavailable"; error: string };

/**
 * Sends a bulk card write a call at a time, so a selection of any size goes. Once one call fails,
 * the rest are not sent and their cards come back unavailable; when the first call fails, it throws.
 */
export async function inCalls<T, R>(
  items: readonly T[],
  idOf: (item: T) => string,
  send: (chunk: T[]) => Promise<{ results: R[] }>,
): Promise<{ results: R[] }> {
  const results: R[] = [];
  for (let at = 0; at < items.length; at += CARD_BATCH_LIMIT) {
    try {
      results.push(...(await send(items.slice(at, at + CARD_BATCH_LIMIT))).results);
    } catch (error) {
      if (at === 0) throw error;
      const message = error instanceof Error ? error.message : String(error);
      for (const item of items.slice(at)) {
        const unsent: Unsent = {
          id: idOf(item),
          status: "error",
          code: "unavailable",
          error: message,
        };
        results.push(unsent as R);
      }
      break;
    }
  }
  return { results };
}
