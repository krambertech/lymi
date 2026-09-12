import { LanguageTag } from "@lymi/core";
import { and, eq } from "@lymi/core/db";
import type { Card } from "@lymi/core/schema";
import type { SpeechProvider } from "../ai";
import { audit } from "../audit";
import { schema } from "../db";
import { getCard } from "./cards";
import { type ServiceContext, ServiceError } from "./context";

interface AudioDependencies {
  bucket: R2Bucket;
  /** Lazy so remembered audio can play without parsing credentials or reaching a provider. */
  providers: (language: string) => SpeechProvider[];
}

/**
 * Return cached pronunciation audio or generate it on the first play. Card creation and
 * enrichment never call this, and cards without a language never reach R2 or a provider.
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

  if (card.audioKey) {
    const remembered = await deps.bucket.get(card.audioKey);
    if (remembered) return remembered;
  }

  const providers = deps.providers(language.data);
  if (providers.length === 0) {
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

    try {
      const generated = await provider.speech({ text: card.term, language: language.data });
      if (!generated.body) throw new Error("Speech provider returned no audio");
      await deps.bucket.put(key, generated.body, {
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
    } catch (error) {
      lastFailure = error;
      console.warn(
        JSON.stringify({
          event: "pronunciation_provider_failed",
          provider: provider.provider,
          language: language.data,
          cardId: card.id,
        }),
      );
    }
  }

  throw new ServiceError(
    "unavailable",
    "Pronunciation audio is temporarily unavailable",
    lastFailure instanceof Error ? { cause: lastFailure.name } : undefined,
  );
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
