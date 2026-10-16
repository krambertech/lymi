/**
 * Below this, a term starts unticked. Clef-flash rates real words as low as 0.17, so the bar only
 * catches what is clearly not a card until a threshold is fitted per deck.
 */
export const KEEP_THRESHOLD = 0.12;

const MODEL = "@cf/cloudflare/clef-flash";

type Candidate = { id: string; term: string; meaning: string; kind: "word" | "phrase" };

/** Workers AI as the Worker sees it; absent in tests and wherever the binding is not configured. */
export type DecisionModel = { run(model: string, input: unknown): Promise<unknown> } | undefined;

/** How likely one term is worth its own card, or null when the model could not judge it. */
export async function keepScore(
  ai: DecisionModel,
  deck: string,
  candidate: Candidate,
): Promise<number | null> {
  return (await keepScores(ai, deck, [candidate])).get(candidate.id) ?? null;
}

/**
 * How likely each term is worth its own card in this deck, from a decision model. A term the model
 * could not judge is left out, so it keeps the reader's choice.
 */
export async function keepScores(
  ai: DecisionModel,
  deck: string,
  candidates: Candidate[],
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  if (!ai || candidates.length === 0) return scores;
  const queue = [...candidates];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const candidate = next;
        try {
          const reply = (await ai.run(MODEL, {
            state: {
              deck,
              candidate: { term: candidate.term, meaning: candidate.meaning, kind: candidate.kind },
            },
            questions: {
              worth: {
                type: "noul",
                instructions:
                  "Is this candidate one term that belongs as its own card in this deck?",
              },
            },
          })) as { answers?: { worth?: { noul?: number } } };
          const p = reply.answers?.worth?.noul;
          if (typeof p === "number") scores.set(candidate.id, p);
        } catch {
          // The list still works without a score: the reader's choice stands.
        }
      }
    }),
  );
  return scores;
}

/** Below this, a term does not fit the learner's own answer and leaves the list. */
const FITS_THRESHOLD = 0.4;

/**
 * The terms that do not fit what the learner wrote in answer to a question, such as "only the verbs"
 * or "skip the numbers". A term the model could not judge stays.
 */
export async function termsAgainstAnswer(
  ai: DecisionModel,
  question: string,
  answer: string,
  terms: { id: string; term: string; gloss: string }[],
): Promise<string[]> {
  if (!ai) return [];
  const drop: string[] = [];
  const queue = [...terms];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const term = next;
        try {
          const reply = (await ai.run(MODEL, {
            state: {
              question,
              learnerAnswer: answer,
              candidate: { term: term.term, meaning: term.gloss },
            },
            questions: {
              fits: {
                type: "noul",
                instructions:
                  "Given the learner's answer to the question, should this candidate stay on the list of cards to add?",
              },
            },
          })) as { answers?: { fits?: { noul?: number } } };
          const p = reply.answers?.fits?.noul;
          if (typeof p === "number" && p < FITS_THRESHOLD) drop.push(term.id);
        } catch {
          // An unjudged term stays: the learner can still untick it.
        }
      }
    }),
  );
  return drop;
}
