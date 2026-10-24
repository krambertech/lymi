import { canSpeakExample, LanguageTag, SPOKEN_EXAMPLE_MAX, spokenExample } from "@lymi/core";
import type { Card } from "@lymi/core/schema";
import type { SpeechProvider, SpeechUsage } from "../ai";
import type { ExampleAllowance } from "../example-audio-rate-limit";
import { aiAllowedForOwner } from "./ai-consent";
import { trackSpeechCall } from "./analytics";
import { type AudioDependencies, boundedAudio, providerStatus } from "./audio";
import { audit } from "./audit";
import { getCard } from "./cards";
import { type ServiceContext, ServiceError } from "./context";
import { withAudioLease } from "./lead-in";

// Bump with any change to how an example is voiced, the prompt included, so every clip is made again.
const EXAMPLE_AUDIO_VERSION = 1;

/** A card's example read aloud: its stored clip, or one made on a press while today's allowance lasts. */
export async function exampleAudio(
  ctx: ServiceContext,
  cardId: string,
  sent: AudioDependencies,
  allowance: ExampleAllowance,
): Promise<{ clip: R2ObjectBody } | { retryAfter: number }> {
  const card = await getCard(ctx, cardId);
  if (card.archivedAt) throw new ServiceError("not_found", "Card not found");
  // The sentence is its owner's, so the owner's choice decides whether it is voiced. ADR 0039.
  const deps = (await aiAllowedForOwner(ctx, card.userId)) ? sent : { ...sent, storedOnly: true };
  const language = LanguageTag.safeParse(card.language);
  if (!language.success || !canSpeakExample(card)) {
    throw new ServiceError(
      "invalid",
      `Example audio is only available for a language card's example of up to ${SPOKEN_EXAMPLE_MAX} spoken characters`,
    );
  }
  const text = spokenExample(card);
  const providers = deps.providers(language.data);
  for (const provider of providers) {
    const cached = await deps.bucket.get(await exampleKey(card, text, provider));
    if (cached) return { clip: cached };
  }
  const preferred = providers[0];
  if (deps.storedOnly || !preferred) {
    throw new ServiceError(
      preferred ? "not_found" : "unavailable",
      preferred ? "Example audio is not stored yet" : "Example audio is not configured",
    );
  }
  const retryAfter = await allowance.left();
  if (retryAfter !== null) return { retryAfter };
  // One provider call per sentence, however many presses or devices ask at once.
  const clip = await withAudioLease(
    deps.bucket,
    `${await exampleKey(card, text, preferred)}.lock`,
    () => voiced(ctx, card, text, language.data, providers, deps.bucket, allowance),
  );
  return { clip };
}

async function voiced(
  ctx: ServiceContext,
  card: Card,
  text: string,
  language: string,
  providers: SpeechProvider[],
  bucket: R2Bucket,
  allowance: ExampleAllowance,
): Promise<R2ObjectBody> {
  // A press that waited out another's lease finds that one's clip.
  for (const provider of providers) {
    const cached = await bucket.get(await exampleKey(card, text, provider));
    if (cached) return cached;
  }
  let lastFailure: unknown;
  for (const provider of providers) {
    const key = await exampleKey(card, text, provider);
    let usage: SpeechUsage = {};
    const started = Date.now();
    const report = (error: boolean, status?: number) =>
      trackSpeechCall(
        ctx.analytics,
        {
          provider: provider.provider,
          model: provider.model,
          characters: [...text].length,
          ...usage,
          latencyMs: Date.now() - started,
          error,
          status,
        },
        "example_audio",
      );
    let audio: Uint8Array;
    try {
      const generated = await provider.speech({
        text,
        language,
        kind: "example",
        usage: (reported) => {
          usage = reported;
        },
      });
      audio = await boundedAudio(generated);
      report(false);
    } catch (error) {
      lastFailure = error;
      const status = providerStatus(error);
      report(true, status ?? undefined);
      console.warn(
        JSON.stringify({
          event: "example_audio_provider_failed",
          provider: provider.provider,
          language,
          error: error instanceof Error ? error.name : "UnknownError",
          ...(status === null ? {} : { status }),
        }),
      );
      continue;
    }
    // A failed write is not a provider's failure, so it never buys a second clip from the next one.
    await bucket.put(key, audio, {
      httpMetadata: {
        contentType: provider.contentType,
        cacheControl: "private, max-age=31536000",
      },
      customMetadata: {
        kind: "example",
        language,
        locale: provider.locale,
        provider: provider.provider,
        model: provider.model,
        voice: provider.voice,
      },
    });
    const stored = await bucket.get(key);
    if (!stored) throw new Error("Generated example audio was not stored");
    await allowance.spend();
    // The clip is a cache on the owner's card, whoever pressed play. ADR 0011.
    await audit(
      { ...ctx, userId: card.userId, actor: "ai" },
      {
        entity: "card",
        action: "generate_audio",
        id: card.id,
        deckId: card.deckId,
        details: { kind: "example", language, provider: provider.provider },
      },
    );
    return stored;
  }
  throw new ServiceError(
    "unavailable",
    "Example audio is temporarily unavailable",
    lastFailure instanceof Error ? { cause: lastFailure.name } : undefined,
  );
}

/** Keyed on what is said and under the card's folder, so an edit reaches a new clip and deletion takes it. */
async function exampleKey(card: Card, text: string, provider: SpeechProvider): Promise<string> {
  const bytes = new TextEncoder().encode(
    ["example", text, provider.locale, provider.provider, provider.model, provider.voice].join(
      "\u0000",
    ),
  );
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const fingerprint = [...digest]
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `cards/${card.id}/example/v${EXAMPLE_AUDIO_VERSION}/${fingerprint}.${provider.extension}`;
}
