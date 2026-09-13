import { describe, expect, it } from "vitest";
import { IMAGE_LIMITS, inspectImage, sniffImage } from "./images";

const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le16 = (n: number) => [n & 255, (n >>> 8) & 255];
const le24 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];
const le32 = (n: number) => [...le16(n & 0xffff), ...le16(n >>> 16)];
const text = (s: string) => [...s].map((c) => c.charCodeAt(0));

function pngChunk(kind: string, data: number[]) {
  return [...be32(data.length), ...text(kind), ...data, 0, 0, 0, 0];
}

function png(width: number, height: number, { animated = false } = {}) {
  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...pngChunk("IHDR", [...be32(width), ...be32(height), 8, 6, 0, 0, 0]),
    ...(animated ? pngChunk("acTL", [...be32(2), ...be32(0)]) : []),
    ...pngChunk("IDAT", [0]),
    ...pngChunk("IEND", []),
  ]);
}

function jpeg(width: number, height: number) {
  return new Uint8Array([
    0xff,
    0xd8,
    // An APP1 segment before the frame, as a camera's EXIF block would be.
    0xff,
    0xe1,
    0x00,
    0x06,
    ...text("Exif"),
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 255,
    height & 255,
    (width >> 8) & 255,
    width & 255,
    0x03,
  ]);
}

function riff(chunks: number[][]) {
  const body = chunks.flat();
  return new Uint8Array([...text("RIFF"), ...le32(body.length + 4), ...text("WEBP"), ...body]);
}

function webpChunk(kind: string, data: number[]) {
  return [...text(kind), ...le32(data.length), ...data, ...(data.length % 2 ? [0] : [])];
}

function webpExtended(width: number, height: number, { animated = false } = {}) {
  const vp8x = webpChunk("VP8X", [
    animated ? 0x02 : 0,
    0,
    0,
    0,
    ...le24(width - 1),
    ...le24(height - 1),
  ]);
  return riff(animated ? [vp8x, webpChunk("ANIM", [0, 0, 0, 0, 0, 0])] : [vp8x]);
}

function webpLossless(width: number, height: number) {
  const bits = (width - 1) | ((height - 1) << 14);
  return riff([webpChunk("VP8L", [0x2f, ...le32(bits)])]);
}

function gif(frames: number) {
  const frame = [0x2c, 0, 0, 0, 0, ...le16(20), ...le16(20), 0, 2, 1, 0, 0];
  return new Uint8Array([
    ...text("GIF89a"),
    ...le16(20),
    ...le16(20),
    0,
    0,
    0,
    ...Array.from({ length: frames }, () => frame).flat(),
    0x3b,
  ]);
}

describe("sniffImage", () => {
  it("reads dimensions from each still format's own header", () => {
    expect(sniffImage(jpeg(640, 480))).toEqual({
      type: "image/jpeg",
      width: 640,
      height: 480,
      animated: false,
    });
    expect(sniffImage(png(300, 200))).toMatchObject({ type: "image/png", width: 300, height: 200 });
    expect(sniffImage(webpExtended(1024, 768))).toMatchObject({
      type: "image/webp",
      width: 1024,
      height: 768,
      animated: false,
    });
    expect(sniffImage(webpLossless(96, 64))).toMatchObject({ width: 96, height: 64 });
    expect(sniffImage(gif(1))).toMatchObject({ type: "image/gif", animated: false });
  });

  it("marks APNG, animated WebP and multi-frame GIF as animated", () => {
    expect(sniffImage(png(64, 64, { animated: true }))?.animated).toBe(true);
    expect(sniffImage(webpExtended(64, 64, { animated: true }))?.animated).toBe(true);
    expect(sniffImage(gif(2))?.animated).toBe(true);
  });

  it("does not recognise SVG, text or a truncated header", () => {
    expect(
      sniffImage(new Uint8Array(text('<svg xmlns="http://www.w3.org/2000/svg"/>'))),
    ).toBeNull();
    expect(sniffImage(new Uint8Array(text("hello")))).toBeNull();
    expect(sniffImage(jpeg(640, 480).slice(0, 12))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
});

describe("inspectImage", () => {
  it("accepts a still image within bounds", () => {
    expect(inspectImage(png(512, 512))).toMatchObject({ ok: true });
  });

  it("names why an image is refused", () => {
    expect(inspectImage(new Uint8Array(text("<svg/>")))).toEqual({
      ok: false,
      reason: "unsupported",
    });
    expect(inspectImage(gif(3))).toEqual({ ok: false, reason: "animated" });
    expect(inspectImage(png(IMAGE_LIMITS.maxSide + 1, 100))).toEqual({
      ok: false,
      reason: "too_large",
    });
    expect(inspectImage(png(10_000, 10_000))).toEqual({ ok: false, reason: "too_large" });
    expect(inspectImage(png(8, 8))).toEqual({ ok: false, reason: "too_small" });
    expect(inspectImage(new Uint8Array(IMAGE_LIMITS.maxBytes + 1))).toEqual({
      ok: false,
      reason: "too_large",
    });
  });
});
