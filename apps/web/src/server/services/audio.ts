import { LanguageTag } from "@lymi/core";
import { and, eq } from "@lymi/core/db";
import type { Card } from "@lymi/core/schema";
import type { SpeechProvider } from "../ai";
import { audit } from "../audit";
import { schema } from "../db";
import { getCard } from "./cards";
import { type ServiceContext, ServiceError } from "./context";

const MAX_AUDIO_BYTES = 8_000_000;

interface AudioDependencies {
  bucket: R2Bucket;
  /** In preference order. Building a provider must not parse credentials or reach the network. */
  providers: (language: string) => SpeechProvider[];
}

/**
 * Return cached pronunciation audio or generate it on the first play. Card creation and
 * enrichment never call this, and cards without a language never reach R2 or a provider.
 * Audio remembered from a fallback or a retired provider is replaced once the preferred one works.
 */
export async function pronunciationAudio(
  ctx: ServiceContext,
  cardId: string,
  deps: AudioDependencies,
): Promise<R2ObjectBody> {
  const card = await getCard(ctx, cardId);
  const language = LanguageTag.safeParse(card.language);
  if (!language.success) {
    throw new ServiceError("invalid", "Pronunciation audio is only available for language cards");
  }
  if (card.archivedAt) throw new ServiceError("not_found", "Card not found");

  const providers = deps.providers(language.data);
  const preferred = providers[0];
  if (card.audioKey && (!preferred || card.audioKey === (await audioKey(card, preferred)))) {
    const remembered = await deps.bucket.get(card.audioKey);
    if (remembered) return remembered;
  }
  if (!preferred) {
    throw new ServiceError("unavailable", "Pronunciation audio is not configured");
  }

  let lastFailure: unknown;
  for (const provider of providers) {
    const key = await audioKey(card, provider);
    const cached = await deps.bucket.get(key);
    if (cached) {
      if (card.audioKey !== key) await rememberAudioKey(ctx, card, key, false, provider.provider);
      return cached;
    }

    let audio: Uint8Array;
    try {
      const generated = await provider.speech({ text: card.term, language: language.data });
      audio = await boundedAudio(generated);
    } catch (error) {
      lastFailure = error;
      const status = providerStatus(error);
      console.warn(
        JSON.stringify({
          event: "pronunciation_provider_failed",
          provider: provider.provider,
          language: language.data,
          error: error instanceof Error ? error.name : "UnknownError",
          ...(status === null ? {} : { status }),
        }),
      );
      continue;
    }

    await deps.bucket.put(key, audio, {
      httpMetadata: {
        contentType: provider.contentType,
        cacheControl: "private, max-age=31536000",
      },
      customMetadata: {
        language: language.data,
        locale: provider.locale,
        provider: provider.provider,
        model: provider.model,
        voice: provider.voice,
      },
    });
    const stored = await deps.bucket.get(key);
    if (!stored) throw new Error("Generated audio was not stored");
    await rememberAudioKey(ctx, card, key, true, provider.provider);
    return stored;
  }

  if (card.audioKey) {
    const remembered = await deps.bucket.get(card.audioKey);
    if (remembered) return remembered;
  }
  throw new ServiceError(
    "unavailable",
    "Pronunciation audio is temporarily unavailable",
    lastFailure instanceof Error ? { cause: lastFailure.name } : undefined,
  );
}

async function boundedAudio(response: Response): Promise<Uint8Array> {
  if (!response.body) throw new AudioResponseError("Speech provider returned no audio");

  const contentLength = response.headers.get("content-length");
  const declaredLength = contentLength === null ? null : Number(contentLength);
  if (
    declaredLength !== null &&
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_AUDIO_BYTES
  ) {
    await response.body.cancel();
    throw new AudioResponseError("Speech provider returned oversized audio");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (chunk.value.byteLength === 0) continue;
      byteLength += chunk.value.byteLength;
      if (byteLength > MAX_AUDIO_BYTES) {
        await reader.cancel();
        throw new AudioResponseError("Speech provider returned oversized audio");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }

  if (byteLength === 0) throw new AudioResponseError("Speech provider returned no audio");
  const audio = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    audio.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return audio;
}

class AudioResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AudioResponseError";
  }
}

function providerStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  return typeof error.status === "number" ? error.status : null;
}

async function rememberAudioKey(
  ctx: ServiceContext,
  card: Card,
  key: string,
  generated: boolean,
  provider: SpeechProvider["provider"],
): Promise<void> {
  const [updated] = await ctx.db
    .update(schema.cards)
    .set({ audioKey: key, updatedAt: new Date() })
    .where(
      and(
        eq(schema.cards.id, card.id),
        eq(schema.cards.userId, card.userId),
        eq(schema.cards.term, card.term),
        eq(schema.cards.language, card.language as string),
      ),
    )
    .returning({ id: schema.cards.id });
  if (!generated || !updated) return;
  // The key is a cache on the owner's card, whoever asked for the audio. ADR 0011.
  await audit(ctx.db, {
    userId: card.userId,
    actor: "ai",
    action: "generate_audio",
    entity: "card",
    entityId: card.id,
    payload: { language: card.language, provider },
  });
}

async function audioKey(card: Card, provider: SpeechProvider): Promise<string> {
  const bytes = new TextEncoder().encode(
    `${card.term}\u0000${provider.locale}\u0000${provider.provider}\u0000${provider.model}\u0000${provider.voice}`,
  );
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const fingerprint = [...digest]
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `cards/${card.id}/${fingerprint}.${provider.extension}`;
}
