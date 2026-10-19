import { canSpeakTerm, kanaReading, LanguageTag, SPOKEN_TERM_MAX } from "@lymi/core";
import { and, eq, inArray, isNull, or } from "@lymi/core/db";
import type { Card } from "@lymi/core/schema";
import type { SpeechProvider, SpeechUsage } from "../ai";
import { speechText } from "../ai/speech-text";
import { type Db, schema } from "../db";
import { type LeadInDependencies, leadInPolicy } from "../lead-ins";
import { trackSpeechCall } from "./analytics";
import { audit } from "./audit";
import { getCard } from "./cards";
import { type ServiceContext, ServiceError } from "./context";
import { type SpokenLeadIn, settleLeadIn, withAudioLease } from "./lead-in";

const MAX_AUDIO_BYTES = 8_000_000;
// Bump this when every stored pronunciation needs to be regenerated on its next play.
const AUDIO_CACHE_VERSION = 2;

export interface AudioDependencies {
  leadIns?: LeadInDependencies | undefined;
  bucket: R2Bucket;
  /** In preference order. Building a provider must not parse credentials or reach the network. */
  providers: (language: string) => SpeechProvider[];
  /** Serve only a clip a play would serve without voicing it, so a preload never spends. */
  storedOnly?: boolean | undefined;
}

/**
 * Return cached pronunciation audio or generate it on the first play. Card creation and
 * enrichment never call this, and cards without a language never reach R2 or a provider.
 * Audio remembered from a fallback or a retired provider is replaced once the preferred one works;
 * a recording an import brought is served as it is.
 */
export async function pronunciationAudio(
  ctx: ServiceContext,
  cardId: string,
  deps: AudioDependencies,
): Promise<R2ObjectBody> {
  const card = await getCard(ctx, cardId);
  if (card.archivedAt) throw new ServiceError("not_found", "Card not found");
  // A recording is never replaced, whatever the term, language or provider. CONTEXT.md, Recording.
  if (card.audioSource === "recorded" && card.audioKey) {
    const recorded = await deps.bucket.get(card.audioKey);
    if (recorded) return recorded;
    throw new ServiceError("unavailable", "The recorded pronunciation is temporarily unavailable");
  }
  const language = LanguageTag.safeParse(card.language);
  if (!language.success) {
    throw new ServiceError("invalid", "Pronunciation audio is only available for language cards");
  }
  if (!canSpeakTerm(card)) {
    throw new ServiceError(
      "invalid",
      `Pronunciation audio is only available for terms of up to ${SPOKEN_TERM_MAX} characters`,
    );
  }

  const providers = deps.providers(language.data);
  const writer = deps.leadIns?.writer;
  const policy =
    writer && providers[0] && takesLeadIn(providers[0]) ? leadInPolicy(language.data) : undefined;
  const screened = policy?.screen(card);
  const input = typeof screened === "object" ? screened : null;
  const spoken =
    policy && input && writer && deps.leadIns
      ? await settleLeadIn(
          card,
          policy,
          input,
          deps.bucket,
          { ...deps.leadIns, writer },
          deps.storedOnly,
          ctx.analytics,
        )
      : undefined;
  if (input && deps.storedOnly && !spoken)
    throw new ServiceError("not_found", "Pronunciation audio is not stored yet");
  return generatedPronunciation(ctx, card, deps, providers, language.data, spoken);
}

async function generatedPronunciation(
  ctx: ServiceContext,
  card: Card,
  deps: AudioDependencies,
  providers: SpeechProvider[],
  language: string,
  spoken?: SpokenLeadIn,
  leased = false,
): Promise<R2ObjectBody> {
  const preferred = providers[0];
  if (
    card.audioKey &&
    (!preferred || card.audioKey === (await audioKey(card, preferred, spoken)))
  ) {
    const remembered = await deps.bucket.get(card.audioKey);
    if (remembered) return remembered;
  }
  if (!preferred) {
    throw new ServiceError("unavailable", "Pronunciation audio is not configured");
  }

  if (spoken && !leased && !deps.storedOnly) {
    const key = await audioKey(card, preferred, spoken);
    const cached = await deps.bucket.get(key);
    if (cached) {
      if (card.audioKey !== key) await rememberAudioKey(ctx, card, key, false, preferred.provider);
      return cached;
    }
    return withAudioLease(deps.bucket, `${key}.lock`, () =>
      generatedPronunciation(ctx, card, deps, providers, language, spoken, true),
    );
  }

  let lastFailure: unknown;
  for (const provider of providers) {
    const key = await audioKey(card, provider, spoken);
    const cached = await deps.bucket.get(key);
    if (cached) {
      if (card.audioKey !== key) await rememberAudioKey(ctx, card, key, false, provider.provider);
      return cached;
    }
    if (deps.storedOnly)
      throw new ServiceError("not_found", "Pronunciation audio is not stored yet");

    let audio: Uint8Array;
    const text = spokenText(card);
    let usage: SpeechUsage = {};
    const started = Date.now();
    const report = (error: boolean, status?: number) =>
      trackSpeechCall(ctx.analytics, {
        provider: provider.provider,
        model: provider.model,
        characters: [...text].length,
        ...usage,
        latencyMs: Date.now() - started,
        error,
        status,
      });
    try {
      const generated = await provider.speech({
        text,
        language,
        usage: (reported) => {
          usage = reported;
        },
        ...(takesLeadIn(provider) && spoken?.previousText
          ? { previousText: spoken.previousText }
          : {}),
      });
      audio = await boundedAudio(generated);
      report(false);
    } catch (error) {
      lastFailure = error;
      const status = providerStatus(error);
      report(true, status ?? undefined);
      console.warn(
        JSON.stringify({
          event: "pronunciation_provider_failed",
          provider: provider.provider,
          language,
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
        language,
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

  // A clip of the same kana without a lead-in, from before contexts, still beats no sound.
  const fallbacks = spoken
    ? await Promise.all(
        providers.flatMap((provider) => [
          audioKey(card, provider, spoken),
          audioKey(card, provider),
        ]),
      )
    : [];
  if (card.audioKey && (!spoken || fallbacks.includes(card.audioKey))) {
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
    .set({ audioKey: key, audioSource: "generated", updatedAt: new Date() })
    .where(
      and(
        eq(schema.cards.id, card.id),
        or(isNull(schema.cards.audioSource), eq(schema.cards.audioSource, "generated")),
        eq(schema.cards.userId, card.userId),
        eq(schema.cards.term, card.term),
        isNull(schema.cards.archivedAt),
        card.pronunciation === null
          ? isNull(schema.cards.pronunciation)
          : eq(schema.cards.pronunciation, card.pronunciation),
        card.meaning === null
          ? isNull(schema.cards.meaning)
          : eq(schema.cards.meaning, card.meaning),
        eq(schema.cards.language, card.language as string),
      ),
    )
    .returning({ id: schema.cards.id });
  if (!generated || !updated) return;
  // The key is a cache on the owner's card, whoever asked for the audio. ADR 0011.
  await audit(
    { ...ctx, userId: card.userId, actor: "ai" },
    {
      entity: "card",
      action: "generate_audio",
      id: card.id,
      deckId: card.deckId,
      details: { language: card.language, provider },
    },
  );
}

/** A Japanese card's kana reading, so 上手 is said じょうず or うわて as the card says, else the term. */
function spokenText(card: Card): string {
  return speechText(kanaReading(card) ?? card.term);
}

// One `IN` list's worth (see selectIn), which also bounds this run's share of the cron's subrequests.
const PURGES_PER_RUN = 90;

/**
 * Clears the audio folders of deleted cards, recordings and superseded speech included, a bounded
 * number per cron run. A card R2 refused stays queued for the next run.
 */
export async function purgeCardAudio(db: Db, bucket: R2Bucket): Promise<number> {
  const queued = await db
    .select({ cardId: schema.cardAudioPurges.cardId })
    .from(schema.cardAudioPurges)
    .orderBy(schema.cardAudioPurges.createdAt)
    .limit(PURGES_PER_RUN);
  const cleared: string[] = [];
  const worker = async () => {
    for (let next = queued.pop(); next; next = queued.pop()) {
      try {
        let cursor: string | undefined;
        do {
          const page = await bucket.list({
            prefix: `cards/${next.cardId}/`,
            ...(cursor ? { cursor } : {}),
          });
          const keys = page.objects.map((object) => object.key);
          if (keys.length > 0) await bucket.delete(keys);
          cursor = page.truncated ? page.cursor : undefined;
        } while (cursor);
        cleared.push(next.cardId);
      } catch {
        // Retried next run; the key is never logged.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(10, queued.length) }, worker));
  if (cleared.length > 0) {
    await db.delete(schema.cardAudioPurges).where(inArray(schema.cardAudioPurges.cardId, cleared));
  }
  return cleared.length;
}

/** Only the voice the lead-ins were auditioned on hears them; others speak the term alone. */
function takesLeadIn(provider: SpeechProvider): boolean {
  return provider.provider === "elevenlabs" && provider.model === "eleven_v4";
}

async function audioKey(
  card: Card,
  provider: SpeechProvider,
  spoken?: SpokenLeadIn,
): Promise<string> {
  const bytes = new TextEncoder().encode(
    `${spokenText(card)}\u0000${provider.locale}\u0000${provider.provider}\u0000${provider.model}\u0000${provider.voice}${takesLeadIn(provider) && spoken?.previousText ? `\u0000${spoken.identity}\u0000${spoken.previousText ?? ""}` : ""}`,
  );
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const fingerprint = [...digest]
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `cards/${card.id}/v${AUDIO_CACHE_VERSION}/${fingerprint}.${provider.extension}`;
}
