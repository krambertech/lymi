import { type HealthEnv, meteredFetch } from "../dependency-health";
import { createOpenAiTextProvider, type OpenAiTextBindings } from "./openai-text";
import type { TextObserver, TextProvider } from "./types";

/** The text provider, or null where no vendor is configured. Builds nothing that reaches a network. */
export function createTextProvider(
  env: OpenAiTextBindings & HealthEnv,
  observe?: TextObserver,
): TextProvider | null {
  return env.OPENAI_API_KEY?.trim()
    ? createOpenAiTextProvider(env, meteredFetch(env, "openai_text"), observe)
    : null;
}
