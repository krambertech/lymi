import { createOpenAiTextProvider, type OpenAiTextBindings } from "./openai-text";
import type { TextProvider } from "./types";

/** The text provider, or null where no vendor is configured. Builds nothing that reaches a network. */
export function createTextProvider(env: OpenAiTextBindings): TextProvider | null {
  return env.OPENAI_API_KEY?.trim() ? createOpenAiTextProvider(env) : null;
}
