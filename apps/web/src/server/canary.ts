import { createOpenAiTextProvider, createSpeechProviders, type SpeechProvider } from "./ai";
import { createJapaneseContextProvider, JapaneseContextError } from "./ai/japanese-audio-context";
import {
  type Dependency,
  type DependencyOutcome,
  meteredFetch,
  outcomeOfError,
  recordCheck,
} from "./dependency-health";
import type { Bindings } from "./env";
import { decisionModel, keepScore } from "./lessons/keep";
import { pingLessonReader } from "./lessons/reader";

const SPEECH: Record<SpeechProvider["provider"], Dependency> = {
  elevenlabs: "elevenlabs",
  "gemini-api": "gemini_speech",
  "google-gemini": "google_speech",
  "google-chirp": "google_speech",
  openai: "openai_speech",
};

const SPEECH_LANGUAGES = ["en", "et"];

class CheckFailed extends Error {
  constructor(readonly outcome: DependencyOutcome) {
    super(`check ${outcome}`);
  }
}

type Check = { dependency: Dependency; run: () => Promise<void> };

/** One retry two seconds later, so a single dropped packet does not page anyone. */
async function verdict(check: Check): Promise<DependencyOutcome> {
  let outcome: DependencyOutcome = "failed";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 2_000));
    try {
      await check.run();
      return "ok";
    } catch (error) {
      outcome = error instanceof CheckFailed ? error.outcome : outcomeOfError(error);
    }
  }
  return outcome;
}

function checks(env: Bindings, hourly: boolean): Check[] {
  const list: Check[] = [
    { dependency: "d1", run: async () => void (await env.DB.prepare("SELECT 1").first()) },
    { dependency: "kv", run: async () => void (await env.SESSIONS.get("canary")) },
    { dependency: "r2", run: async () => void (await env.AUDIO.head("canary")) },
    {
      dependency: "site",
      run: async () => {
        const response = await meteredFetch(
          env,
          "site",
          "canary",
        )(new URL("/api/health", env.PUBLIC_SITE_URL), { signal: AbortSignal.timeout(10_000) });
        const body = (await response.json().catch(() => null)) as { ok?: unknown } | null;
        if (!response.ok || body?.ok !== true) throw new CheckFailed("failed");
      },
    },
    {
      dependency: "openai_text",
      run: async () => {
        // A missing key in production is as broken as an unreachable vendor.
        if (!env.OPENAI_API_KEY?.trim()) throw new CheckFailed("failed");
        const reply = await createOpenAiTextProvider(
          env,
          meteredFetch(env, "openai_text", "canary"),
        ).complete({
          instructions: "This is a health check.",
          input: "Set ok to true.",
          schema: {
            name: "health_check",
            schema: {
              type: "object",
              properties: { ok: { type: "boolean" } },
              required: ["ok"],
              additionalProperties: false,
            },
          },
          effort: "low",
        });
        if (!reply) throw new CheckFailed("failed");
      },
    },
    {
      dependency: "anthropic",
      run: async () => {
        if (!env.ANTHROPIC_API_KEY?.trim()) throw new CheckFailed("failed");
        await pingLessonReader(env, meteredFetch(env, "anthropic", "canary"));
      },
    },
    {
      dependency: "workers_ai",
      run: async () => {
        const score = await keepScore(decisionModel(env, "canary"), "English", {
          id: "canary",
          term: "house",
          meaning: "a building people live in",
          kind: "word",
        });
        if (score === null) throw new CheckFailed("failed");
      },
    },
  ];
  // Speech is billed per call, so it is checked hourly rather than every run.
  if (hourly) {
    const seen = new Set<SpeechProvider["provider"]>();
    // English has no native ElevenLabs voice, so Estonian brings ElevenLabs into the check.
    for (const language of SPEECH_LANGUAGES) {
      for (const provider of createSpeechProviders(env, language, "canary")) {
        if (seen.has(provider.provider)) continue;
        seen.add(provider.provider);
        list.push({
          dependency: SPEECH[provider.provider],
          run: async () => {
            const response = await provider.speech({ text: "ok", language });
            await response.body?.cancel();
          },
        });
      }
    }
    // Google limits Gemini 2.5 to keys that already used it, so the deployed key is checked here.
    const context = createJapaneseContextProvider(env, meteredFetch(env, "gemini_text", "canary"));
    if (context)
      list.push({
        dependency: "gemini_text",
        run: async () => {
          try {
            await context.generate({ term: "船", reading: "ふね", meaning: "boat" });
          } catch (error) {
            if (!(error instanceof JapaneseContextError)) throw error;
            // A reply that failed our checks still proves the key works.
            if (error.reason === "failed") throw new CheckFailed("failed");
          }
        },
      });
  }
  return list;
}

/**
 * The production canary: calls each outside service the way a learner's request would and records
 * one verdict per service in lymi_health, where the alerts in docs/operations.md read it.
 */
export async function runCanary(env: Bindings, at: Date): Promise<void> {
  await Promise.all(
    checks(env, at.getUTCMinutes() < 15).map(async (check) => {
      const started = Date.now();
      const outcome = await verdict(check);
      recordCheck(env, {
        dependency: check.dependency,
        outcome,
        durationMs: Date.now() - started,
      });
    }),
  );
}
