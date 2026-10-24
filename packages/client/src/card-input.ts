import { type CardInput, modeOf, type ReviewModeKey } from "@lymi/core";

/** What a composer holds for a new card. Empty text is left out; null modes follow the deck. */
export interface AddValues {
  deckId: string;
  term: string;
  meaning?: string | undefined;
  example?: string | undefined;
  exampleTranslation?: string | undefined;
  pronunciation?: string | undefined;
  notes?: string | undefined;
  hook?: string | undefined;
  source?: string | undefined;
  tags?: string[] | undefined;
  language?: string | null | undefined;
  reviewModes?: ReviewModeKey[] | null | undefined;
  sectionId?: string | null | undefined;
}

/** A new card as the add route takes it: typed text is the learner's, and empty fields stay out. */
export function addInput(values: AddValues): CardInput {
  return {
    deckId: values.deckId,
    term: values.term,
    ...(values.language !== undefined ? { language: values.language } : {}),
    ...(values.meaning ? { meaning: values.meaning, meaningSource: "manual" as const } : {}),
    ...(values.example ? { example: values.example, exampleSource: "manual" as const } : {}),
    ...(values.example && values.exampleTranslation
      ? {
          exampleTranslation: values.exampleTranslation,
          exampleTranslationSource: "manual" as const,
        }
      : {}),
    ...(values.pronunciation
      ? { pronunciation: values.pronunciation, pronunciationSource: "manual" as const }
      : {}),
    ...(values.notes ? { notes: values.notes, notesSource: "manual" as const } : {}),
    ...(values.hook ? { hook: values.hook, hookSource: "manual" as const } : {}),
    ...(values.source ? { source: values.source } : {}),
    ...(values.tags?.length ? { tags: values.tags } : {}),
    ...(values.reviewModes ? { reviewModes: values.reviewModes.map(modeOf) } : {}),
    ...(values.sectionId ? { sectionId: values.sectionId } : {}),
  };
}

/**
 * The draft after an add: each field still holding what was sent is cleared, and anything typed
 * while the add was in flight stays. Fields named in `keep`, such as the lesson a card came from,
 * stay as they are.
 */
export function clearSent<T extends Record<string, string>>(
  draft: T,
  sent: Partial<Record<keyof T, string | undefined>>,
  keep: readonly (keyof T)[] = [],
): T {
  const next = { ...draft };
  for (const key of Object.keys(draft) as (keyof T)[]) {
    if (keep.includes(key)) continue;
    if (String(draft[key]).trim() === (sent[key] ?? "").trim()) next[key] = "" as T[keyof T];
  }
  return next;
}
