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
  const bytes = await load();
  const format = bytes && recordingFormat(bytes);
  if (!bytes || !format || bytes.byteLength === 0 || bytes.byteLength > MAX_RECORDING_BYTES) {
    return "skipped";
  }

  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.slice()));
  const fingerprint = [...digest.subarray(0, 16)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const key = `cards/${cardId}/recorded/${fingerprint}.${format.extension}`;
  await bucket.put(key, bytes, {
    httpMetadata: { contentType: format.contentType, cacheControl: "private, max-age=31536000" },
    customMetadata: { source: "import" },
  });
  const stored = and(eq(schema.cards.id, cardId), eq(schema.cards.audioKey, key))!;
  await ctx.db.batch([
    ctx.db
      .update(schema.cards)
      .set({ audioKey: key, audioSource: "recorded", updatedAt: new Date() })
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
        details: { format: format.extension },
      },
      schema.cards,
      stored,
    ),
  ]);
  return "stored";
}
