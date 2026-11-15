import { sameExample } from "@lymi/core";
import { and, eq, isNull, or } from "@lymi/core/db";
import { schema } from "../db";
import { auditStatementWhen } from "./audit";
import type { ServiceContext } from "./context";

/** A term's clip is seconds long; anything past this is not one, and is left out. */
export const MAX_RECORDING_BYTES = 2 * 1024 * 1024;

type RecordingFormat = { extension: string; contentType: string };

/**
 * The format of a recording by its bytes, or null for one the web and the phone cannot both play,
 * such as Ogg or Opus, which is left out so generated speech fills the card instead.
 */
export function recordingFormat(bytes: Uint8Array): RecordingFormat | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 3) === "ID3") return { extension: "mp3", contentType: "audio/mpeg" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") {
    return { extension: "wav", contentType: "audio/wav" };
  }
  if (ascii(4, 8) === "ftyp") return { extension: "m4a", contentType: "audio/mp4" };
  const [first = 0, second = 0] = bytes;
  if (first === 0xff && (second & 0xe0) === 0xe0) {
    // MPEG audio has a layer; ADTS, which is raw AAC, has none.
    return (second & 0x06) === 0
      ? { extension: "aac", contentType: "audio/aac" }
      : { extension: "mp3", contentType: "audio/mpeg" };
  }
  return null;
}

/** A clip's bytes as an object under the card's folder, or null for one that is not a recording. */
async function putRecording(
  bucket: R2Bucket,
  cardId: string,
  folder: "recorded" | "example-recorded",
  bytes: Uint8Array | null,
): Promise<{ key: string; format: RecordingFormat } | null> {
  const format = bytes && recordingFormat(bytes);
  if (!bytes || !format || bytes.byteLength === 0 || bytes.byteLength > MAX_RECORDING_BYTES) {
    return null;
  }
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.slice()));
  const fingerprint = [...digest.subarray(0, 16)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const key = `cards/${cardId}/${folder}/${fingerprint}.${format.extension}`;
  await bucket.put(key, bytes, {
    httpMetadata: { contentType: format.contentType, cacheControl: "private, max-age=31536000" },
    customMetadata: { source: "import" },
  });
  return { key, format };
}

/**
 * Stores an imported recording as the card's audio, which nothing replaces afterwards. A card
 * that already has a recording keeps it without reading the clip, so a retried step changes
 * nothing. `skipped` is a clip that could not be read, played or fitted, or a card not found.
 */
export async function storeRecording(
  ctx: ServiceContext,
  cardId: string,
  load: () => Promise<Uint8Array | null>,
  bucket: R2Bucket,
): Promise<"stored" | "kept" | "skipped"> {
  const [card] = await ctx.db
    .select({ deckId: schema.cards.deckId, audioSource: schema.cards.audioSource })
    .from(schema.cards)
    .where(and(eq(schema.cards.id, cardId), eq(schema.cards.userId, ctx.userId)));
  if (!card) return "skipped";
  if (card.audioSource === "recorded") return "kept";
  const put = await putRecording(bucket, cardId, "recorded", await load());
  if (!put) return "skipped";
  const stored = and(eq(schema.cards.id, cardId), eq(schema.cards.audioKey, put.key))!;
  await ctx.db.batch([
    ctx.db
      .update(schema.cards)
      .set({ audioKey: put.key, audioSource: "recorded", updatedAt: new Date() })
      .where(
        and(
          eq(schema.cards.id, cardId),
          eq(schema.cards.userId, ctx.userId),
          or(isNull(schema.cards.audioSource), eq(schema.cards.audioSource, "generated")),
        ),
      ),
    auditStatementWhen(
      ctx,
      {
        entity: "card",
        action: "set_audio",
        id: cardId,
        deckId: card.deckId,
        details: { format: put.format.extension },
      },
      schema.cards,
      stored,
    ),
  ]);
  return "stored";
}

/**
 * Stores an imported clip of the example as its recording, which its play control plays instead
 * of generated speech, on the same terms as `storeRecording`. A card that no longer says `said`,
 * the sentence the clip was imported with, has nothing to play it beside, so the clip is skipped.
 */
export async function storeExampleRecording(
  ctx: ServiceContext,
  cardId: string,
  said: string | undefined,
  load: () => Promise<Uint8Array | null>,
  bucket: R2Bucket,
): Promise<"stored" | "kept" | "skipped"> {
  const [card] = await ctx.db
    .select({
      deckId: schema.cards.deckId,
      language: schema.cards.language,
      example: schema.cards.example,
      exampleRecordingKey: schema.cards.exampleRecordingKey,
    })
    .from(schema.cards)
    .where(and(eq(schema.cards.id, cardId), eq(schema.cards.userId, ctx.userId)));
  if (!card) return "skipped";
  if (card.exampleRecordingKey) return "kept";
  if (!card.example || !sameExample(card.language, card.example, said)) return "skipped";
  const put = await putRecording(bucket, cardId, "example-recorded", await load());
  if (!put) return "skipped";
  const stored = and(eq(schema.cards.id, cardId), eq(schema.cards.exampleRecordingKey, put.key))!;
  await ctx.db.batch([
    ctx.db
      .update(schema.cards)
      .set({ exampleRecordingKey: put.key, updatedAt: new Date() })
      .where(
        and(
          eq(schema.cards.id, cardId),
          eq(schema.cards.userId, ctx.userId),
          eq(schema.cards.example, card.example),
          isNull(schema.cards.exampleRecordingKey),
        ),
      ),
    auditStatementWhen(
      ctx,
      {
        entity: "card",
        action: "set_audio",
        id: cardId,
        deckId: card.deckId,
        details: { kind: "example", format: put.format.extension },
      },
      schema.cards,
      stored,
    ),
  ]);
  return "stored";
}
