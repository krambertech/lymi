import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bytesSource,
  decodeProto,
  ImportFileError,
  isZstd,
  openZip,
  proto,
  readZipEntry,
  zstdDecompressBytes,
} from "./files";

const fixture = (name: string) =>
  new Uint8Array(readFileSync(new URL(`./anki/fixtures/${name}`, import.meta.url)));

/** A zip of stored entries, optionally with every size and offset moved into Zip64 fields. */
function storedZip(entries: Record<string, string>, { zip64 = false, flags = 0 } = {}) {
  const parts: number[] = [];
  const central: number[] = [];
  const le = (n: number, width: number) =>
    Array.from({ length: width }, (_, i) => Number((BigInt(n) >> BigInt(8 * i)) & 0xffn));
  const names = Object.keys(entries);
  for (const name of names) {
    const data = [...new TextEncoder().encode(entries[name])];
    const nameBytes = [...new TextEncoder().encode(name)];
    const offset = parts.length;
    const size = zip64 ? 0xffffffff : data.length;
    const extra = zip64
      ? [...le(1, 2), ...le(24, 2), ...le(data.length, 8), ...le(data.length, 8), ...le(offset, 8)]
      : [];
    parts.push(
      ...le(0x04034b50, 4),
      ...le(45, 2),
      ...le(flags, 2),
      ...le(0, 2),
      ...le(0, 4),
      ...le(0, 4),
    );
    parts.push(
      ...le(data.length, 4),
      ...le(data.length, 4),
      ...le(nameBytes.length, 2),
      ...le(0, 2),
      ...nameBytes,
      ...data,
    );
    central.push(
      ...le(0x02014b50, 4),
      ...le(45, 2),
      ...le(45, 2),
      ...le(flags, 2),
      ...le(0, 2),
      ...le(0, 4),
      ...le(0, 4),
    );
    central.push(
      ...le(size, 4),
      ...le(size, 4),
      ...le(nameBytes.length, 2),
      ...le(extra.length, 2),
      ...le(0, 2),
    );
    central.push(
      ...le(0, 2),
      ...le(0, 2),
      ...le(0, 4),
      ...le(zip64 ? 0xffffffff : offset, 4),
      ...nameBytes,
      ...extra,
    );
  }
  const directoryOffset = parts.length;
  parts.push(...central);
  if (zip64) {
    const record = parts.length;
    parts.push(
      ...le(0x06064b50, 4),
      ...le(44, 8),
      ...le(45, 2),
      ...le(45, 2),
      ...le(0, 4),
      ...le(0, 4),
    );
    parts.push(
      ...le(names.length, 8),
      ...le(names.length, 8),
      ...le(central.length, 8),
      ...le(directoryOffset, 8),
    );
    parts.push(...le(0x07064b50, 4), ...le(0, 4), ...le(record, 8), ...le(1, 4));
  }
  parts.push(...le(0x06054b50, 4), ...le(0, 2), ...le(0, 2));
  parts.push(...le(zip64 ? 0xffff : names.length, 2), ...le(zip64 ? 0xffff : names.length, 2));
  parts.push(
    ...le(zip64 ? 0xffffffff : central.length, 4),
    ...le(zip64 ? 0xffffffff : directoryOffset, 4),
    ...le(0, 2),
  );
  return new Uint8Array(parts);
}

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("openZip and readZipEntry", () => {
  it("reads stored and deflated entries from a real Anki export", async () => {
    const file = bytesSource(fixture("legacy.apkg"));
    const zip = await openZip(file);
    expect([...zip.keys()].sort()).toEqual([
      "0",
      "1",
      "2",
      "collection.anki2",
      "collection.anki21",
      "media",
      "meta",
    ]);
    const collection = zip.get("collection.anki21");
    expect(collection?.method).toBe(8);
    const bytes = await readZipEntry(file, collection as never, 10_000_000);
    expect(text(bytes.subarray(0, 15))).toBe("SQLite format 3");
    expect(
      JSON.parse(text(await readZipEntry(file, zip.get("media") as never, 1000))),
    ).toMatchObject({
      "1": "gatto.png",
    });
  });

  it("reads Zip64 sizes and offsets", async () => {
    const file = bytesSource(storedZip({ a: "first", "b/ü.txt": "second" }, { zip64: true }));
    const zip = await openZip(file);
    expect(text(await readZipEntry(file, zip.get("b/ü.txt") as never, 100))).toBe("second");
  });

  it("refuses an entry past the limit before reading it", async () => {
    const file = bytesSource(storedZip({ big: "x".repeat(500) }));
    const zip = await openZip(file);
    await expect(readZipEntry(file, zip.get("big") as never, 100)).rejects.toMatchObject({
      failure: "too_large",
    });
  });

  it("says what is wrong with a file that is not a usable zip", async () => {
    await expect(
      openZip(bytesSource(new TextEncoder().encode("hello world, not a zip"))),
    ).rejects.toMatchObject({
      failure: "unrecognized",
    });
    await expect(openZip(bytesSource(storedZip({ a: "b" }, { flags: 1 })))).rejects.toMatchObject({
      failure: "unrecognized",
    });
    const cut = fixture("legacy.apkg");
    await expect(openZip(bytesSource(cut.subarray(0, cut.length - 30)))).rejects.toBeInstanceOf(
      ImportFileError,
    );
  });
});

describe("zstd and protobuf", () => {
  it("decompresses a current Anki collection and its media index", async () => {
    const file = bytesSource(fixture("current.apkg"));
    const zip = await openZip(file);
    const raw = await readZipEntry(file, zip.get("collection.anki21b") as never, 10_000_000);
    expect(isZstd(raw)).toBe(true);
    const collection = await zstdDecompressBytes(raw, 10_000_000);
    expect(text(collection.subarray(0, 15))).toBe("SQLite format 3");

    const media = decodeProto(
      await zstdDecompressBytes(await readZipEntry(file, zip.get("media") as never, 1000), 1000),
    );
    const names = proto.all(media, 1).map((entry) => proto.text(decodeProto(entry), 1));
    expect(names).toEqual(["gatto.png", "cane.png", "gatto.mp3"]);
    expect(
      proto.varint(decodeProto(await readZipEntry(file, zip.get("meta") as never, 10)), 1),
    ).toBe(3);
  });

  it("refuses output past the limit and damaged input", async () => {
    const file = bytesSource(fixture("current.apkg"));
    const zip = await openZip(file);
    const raw = await readZipEntry(file, zip.get("collection.anki21b") as never, 10_000_000);
    await expect(zstdDecompressBytes(raw, 1000)).rejects.toMatchObject({ failure: "too_large" });
    const broken = raw.slice(0, raw.length / 2);
    await expect(zstdDecompressBytes(broken, 10_000_000)).rejects.toMatchObject({
      failure: "damaged",
    });
  });

  it("decodes varints past 32 bits and skips fixed-width fields", () => {
    // field 1 varint 2^35, field 2 fixed64, field 3 bytes "hi"
    const bytes = new Uint8Array([
      0x08, 0x80, 0x80, 0x80, 0x80, 0x80, 0x01, 0x11, 1, 2, 3, 4, 5, 6, 7, 8, 0x1a, 2, 104, 105,
    ]);
    const fields = decodeProto(bytes);
    expect(proto.varint(fields, 1)).toBe(2 ** 35);
    expect(proto.text(fields, 3)).toBe("hi");
    expect(() => decodeProto(new Uint8Array([0x1a, 9, 1]))).toThrow(ImportFileError);
  });
});
