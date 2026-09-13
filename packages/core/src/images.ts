/**
 * Recognising a still image from its bytes. Private images (avatars now, card images later)
 * are judged by what the file is, never by its name or a client's content type.
 */

export type StillImageType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export interface SniffedImage {
  type: StillImageType;
  width: number;
  height: number;
  animated: boolean;
}

/** Bounds every private image is held to before anything decodes it. */
export const IMAGE_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxSide: 12_000,
  maxPixels: 50_000_000,
  minSide: 16,
} as const;

export type ImageRejection = "unsupported" | "animated" | "too_large" | "too_small";

/** The image, or why it cannot be accepted. SVG, HEIC and anything unrecognised are unsupported. */
export function inspectImage(
  bytes: Uint8Array,
): { ok: true; image: SniffedImage } | { ok: false; reason: ImageRejection } {
  if (bytes.byteLength > IMAGE_LIMITS.maxBytes) return { ok: false, reason: "too_large" };
  const image = sniffImage(bytes);
  if (!image) return { ok: false, reason: "unsupported" };
  if (image.animated) return { ok: false, reason: "animated" };
  const { width, height } = image;
  if (width > IMAGE_LIMITS.maxSide || height > IMAGE_LIMITS.maxSide) {
    return { ok: false, reason: "too_large" };
  }
  if (width * height > IMAGE_LIMITS.maxPixels) return { ok: false, reason: "too_large" };
  if (width < IMAGE_LIMITS.minSide || height < IMAGE_LIMITS.minSide) {
    return { ok: false, reason: "too_small" };
  }
  return { ok: true, image };
}

/** Type, dimensions and animation from the file's own headers, or null when it is none of ours. */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  try {
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) return jpeg(bytes);
    if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return png(bytes);
    if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return webp(bytes);
    const gifHeader = ascii(bytes, 0, 6);
    if (gifHeader === "GIF87a" || gifHeader === "GIF89a") return gif(bytes);
  } catch (err) {
    if (err instanceof RangeError) return null;
    throw err;
  }
  return null;
}

function jpeg(b: Uint8Array): SniffedImage | null {
  let i = 2;
  while (i + 4 <= b.byteLength) {
    if (at(b, i) !== 0xff) return null;
    const marker = at(b, i + 1);
    // Fill bytes, then markers that carry no length.
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    const length = u16be(b, i + 2);
    const isFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      return {
        type: "image/jpeg",
        height: u16be(b, i + 5),
        width: u16be(b, i + 7),
        animated: false,
      };
    }
    if (marker === 0xda || length < 2) return null;
    i += 2 + length;
  }
  return null;
}

function png(b: Uint8Array): SniffedImage | null {
  if (ascii(b, 12, 4) !== "IHDR") return null;
  const width = u32be(b, 16);
  const height = u32be(b, 20);
  let animated = false;
  let i = 8;
  while (i + 8 <= b.byteLength) {
    const length = u32be(b, i);
    const kind = ascii(b, i + 4, 4);
    // APNG declares its animation before the first image data.
    if (kind === "acTL") animated = true;
    if (kind === "IDAT" || kind === "IEND") break;
    i += 12 + length;
  }
  return { type: "image/png", width, height, animated };
}

function webp(b: Uint8Array): SniffedImage | null {
  const chunk = ascii(b, 12, 4);
  let animated = false;
  let width: number;
  let height: number;
  if (chunk === "VP8X") {
    animated = (at(b, 20) & 0x02) !== 0;
    width = 1 + u24le(b, 24);
    height = 1 + u24le(b, 27);
  } else if (chunk === "VP8 ") {
    if (at(b, 23) !== 0x9d || at(b, 24) !== 0x01 || at(b, 25) !== 0x2a) return null;
    width = u16le(b, 26) & 0x3fff;
    height = u16le(b, 28) & 0x3fff;
  } else if (chunk === "VP8L") {
    if (at(b, 20) !== 0x2f) return null;
    const bits = u32le(b, 21);
    width = 1 + (bits & 0x3fff);
    height = 1 + ((bits >>> 14) & 0x3fff);
  } else {
    return null;
  }
  // An animation chunk anywhere counts, whatever the header flag says.
  let i = 12;
  while (i + 8 <= b.byteLength) {
    const kind = ascii(b, i, 4);
    if (kind === "ANIM" || kind === "ANMF") animated = true;
    const size = u32le(b, i + 4);
    i += 8 + size + (size % 2);
  }
  return { type: "image/webp", width, height, animated };
}

function gif(b: Uint8Array): SniffedImage | null {
  const width = u16le(b, 6);
  const height = u16le(b, 8);
  const flags = at(b, 10);
  let i = 13;
  if (flags & 0x80) i += 3 * 2 ** ((flags & 0x07) + 1);
  let frames = 0;
  while (i < b.byteLength) {
    const block = at(b, i);
    if (block === 0x3b) break;
    if (block === 0x21) {
      i = skipSubBlocks(b, i + 2);
    } else if (block === 0x2c) {
      frames += 1;
      if (frames > 1) break;
      const local = at(b, i + 9);
      i += 10;
      if (local & 0x80) i += 3 * 2 ** ((local & 0x07) + 1);
      i = skipSubBlocks(b, i + 1);
    } else {
      return null;
    }
  }
  if (frames === 0) return null;
  return { type: "image/gif", width, height, animated: frames > 1 };
}

function skipSubBlocks(b: Uint8Array, start: number): number {
  let i = start;
  for (let size = at(b, i); size !== 0; size = at(b, i)) i += size + 1;
  return i + 1;
}

function at(b: Uint8Array, i: number): number {
  const value = b[i];
  if (value === undefined) throw new RangeError("Image header ends early");
  return value;
}

function startsWith(b: Uint8Array, prefix: number[]): boolean {
  return prefix.every((value, i) => b[i] === value);
}

function ascii(b: Uint8Array, start: number, length: number): string {
  let out = "";
  for (let i = start; i < start + length && i < b.byteLength; i++) {
    out += String.fromCharCode(at(b, i));
  }
  return out;
}

const u16be = (b: Uint8Array, i: number) => (at(b, i) << 8) | at(b, i + 1);
const u16le = (b: Uint8Array, i: number) => at(b, i) | (at(b, i + 1) << 8);
const u24le = (b: Uint8Array, i: number) => at(b, i) | (at(b, i + 1) << 8) | (at(b, i + 2) << 16);
const u32be = (b: Uint8Array, i: number) =>
  ((at(b, i) << 24) | (at(b, i + 1) << 16) | (at(b, i + 2) << 8) | at(b, i + 3)) >>> 0;
const u32le = (b: Uint8Array, i: number) =>
  (at(b, i) | (at(b, i + 1) << 8) | (at(b, i + 2) << 16) | (at(b, i + 3) << 24)) >>> 0;
