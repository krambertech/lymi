import { type ImageRejection, inspectImage, sniffImage } from "@lymi/core";
import { ServiceError } from "./context";

export interface NormalizedImage {
  bytes: Uint8Array;
  type: "image/webp";
  width: number;
  height: number;
}

const REJECTIONS: Record<ImageRejection | "unreadable", string> = {
  unsupported: "Use a JPEG, PNG, WebP or still GIF image.",
  animated: "Animated images can’t be used. Choose a still image.",
  too_large: "That image is too large. Use one under 10 MB and 12,000 pixels on a side.",
  too_small: "That image is too small. Use one at least 16 pixels on a side.",
  unreadable: "That image couldn’t be read. Try another file.",
};

/**
 * One bounded square WebP from any accepted still image. The bytes are checked before the
 * Images binding decodes them and again after it encodes, and WebP output carries no metadata.
 */
export async function normalizeSquareImage(
  images: ImagesBinding,
  bytes: Uint8Array,
  size: number,
): Promise<NormalizedImage> {
  const inspected = inspectImage(bytes);
  if (!inspected.ok) throw rejection(inspected.reason);

  let output: Uint8Array;
  try {
    const info = await images.info(streamOf(bytes));
    if (!("width" in info) || info.width <= 0 || info.height <= 0) throw rejection("unsupported");
    const result = await images
      .input(streamOf(bytes))
      .transform({ width: size, height: size, fit: "cover" })
      .output({ format: "image/webp", quality: 85, anim: false });
    output = new Uint8Array(await new Response(result.image()).arrayBuffer());
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw rejection("unreadable");
  }

  const encoded = sniffImage(output);
  if (encoded?.type !== "image/webp" || encoded.animated) throw rejection("unreadable");
  return { bytes: output, type: "image/webp", width: encoded.width, height: encoded.height };
}

/** The whole body, or null once it passes `maxBytes`, so an oversized stream is never buffered. */
export async function readAtMost(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<Uint8Array | null> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function rejection(reason: ImageRejection | "unreadable"): ServiceError {
  return new ServiceError("invalid", REJECTIONS[reason], [{ message: REJECTIONS[reason], reason }]);
}

function streamOf(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
