import { z } from "zod";

/** Raise with any change to what the model reads, so analytics can tell runs apart. */
export const PITCH_PROMPT_VERSION = 1;

/** Luna gets about 1 word in 6 wrong however hard it reasons; see docs/stack.md. */
export const PITCH_MODEL = "gpt-6.1-terra";

/** Medium matched high on 48 common words in a third of the time. */
export const PITCH_EFFORT = "medium";

export const PITCH_INSTRUCTIONS = `You are a Japanese phonetics reference. For each word, give its standard Tokyo pitch accent as listed in the NHK pronunciation accent dictionary or the Shin Meikai accent dictionary: the mora the pitch falls after, or 0 for a word with no fall. Long vowels, ん and っ each count as one mora; a small ゃ, ゅ or ょ joins the mora before it. Recall the dictionary entry; do not derive it from rules. When a word has two accepted accents, give the most common. Return accent null for a word you cannot recall, rather than guessing.`;

/** One word to look up, as the model reads it. */
export function pitchInput(words: readonly { id: string; term: string; reading: string }[]) {
  return JSON.stringify({ words });
}

const Reply = z.object({
  words: z.array(
    z.object({ id: z.string(), accent: z.number().int().min(0).nullable().catch(null) }),
  ),
});

/** The accents a reply gives, by word id, leaving out a word the model could not recall. */
export function readPitchReply(raw: unknown): Map<string, number> {
  const words = Reply.safeParse(raw).data?.words ?? [];
  return new Map(words.flatMap(({ id, accent }) => (accent === null ? [] : [[id, accent]])));
}

export const PITCH_REPLY_SCHEMA = {
  name: "pitch_accents",
  schema: {
    type: "object",
    properties: {
      words: {
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "string" }, accent: { type: ["integer", "null"] } },
          required: ["id", "accent"],
          additionalProperties: false,
        },
      },
    },
    required: ["words"],
    additionalProperties: false,
  },
} as const;
