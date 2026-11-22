import { type HealthEnv, meteredFetch } from "../dependency-health";
import type { AiConsent } from "./consent";
import { createOpenAiTextProvider, type OpenAiTextBindings } from "./openai-text";
import type { TextObserver, TextProvider } from "./types";

/** The text provider, or null where no vendor is configured. Builds nothing that reaches a network. */
export function createTextProvider(
  env: OpenAiTextBindings & HealthEnv,
  consent: AiConsent,
  observe: TextObserver | null,
): TextProvider | null {
  return env.OPENAI_API_KEY?.trim()
    ? createOpenAiTextProvider(env, consent, meteredFetch(env, "openai_text"), observe)
    : null;
}
