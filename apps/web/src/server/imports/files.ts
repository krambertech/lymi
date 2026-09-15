import { Decompress } from "fzstd";

/**
 * Readers for the containers source files arrive in: a zip read by ranges so media never
 * loads whole, zstd, and protobuf. Errors are `ImportFileError` with a failure code and no
 * file content, because messages can reach logs.
 */

export class ImportFileError extends Error {
  constructor(
    public readonly failure: "unrecognized" | "damaged" | "too_large",
    message: string,
  ) {
    super(message);
    this.name = "ImportFileError";
  }
}

const damaged = (what: string) => new ImportFileError("damaged", `The file's ${what} is damaged`);

/** A file the readers can take any byte range of: an R2 object or bytes in memory. */
export interface RandomAccess {
  size: number;
  read(offset: number, length: number): Promise<Uint8Array>;
  stream(offset: number, length: number): Promise<ReadableStream<Uint8Array>>;
}

export function bytesSource(bytes: Uint8Array): RandomAccess {
  const slice = (offset: number, length: number) => {
    if (offset < 0 || offset + length > bytes.byteLength) throw damaged("layout");
    return bytes.subarray(offset, offset + length);
  };
  return {
    size: bytes.byteLength,
    read: async (offset, length) => slice(offset, length),
    stream: async (offset, length) => {
      const chunk = slice(offset, length);
      return new ReadableStream({
        start(controller) {
          controller.enqueue(chunk);
          controller.close();
        },
      });
    },
  };
}

export async function r2Source(bucket: R2Bucket, key: string): Promise<RandomAccess> {
  const head = await bucket.head(key);
  if (!head) throw new ImportFileError("damaged", "The uploaded file is missing");
  const get = async (offset: number, length: number) => {
    if (offset < 0 || offset + length > head.size) throw damaged("layout");
    const object = await bucket.get(key, { range: { offset, length } });
    if (!object) throw new ImportFileError("damaged", "The uploaded file is missing");
    return object;
  };
  return {
    size: head.size,
    read: async (offset, length) => {
      if (length === 0) return new Uint8Array();
      return new Uint8Array(await (await get(offset, length)).arrayBuffer());
    },
    stream: async (offset, length) => {
      if (length === 0) return new Blob([]).stream();
      return (await get(offset, length)).body;
    },
  };
}

export type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  offset: number;
};

const u16 = (b: Uint8Array, at: number) => (b[at] ?? 0) | ((b[at + 1] ?? 0) << 8);
const u32 = (b: Uint8Array, at: number) => (u16(b, at) + u16(b, at + 2) * 0x10000) >>> 0;
const u64 = (b: Uint8Array, at: number) => {
  const value = u32(b, at) + u32(b, at + 4) * 0x1_0000_0000;
  if (!Number.isSafeInteger(value)) throw damaged("layout");
  return value;
};

/** The zip's entries by name, read from its central directory alone. Zip64 is supported. */
export async function openZip(file: RandomAccess): Promise<Map<string, ZipEntry>> {
  const tailLength = Math.min(file.size, 22 + 0xffff);
  if (file.size < 22) throw new ImportFileError("unrecognized", "The file is not a zip");
  const tail = await file.read(file.size - tailLength, tailLength);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (u32(tail, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ImportFileError("unrecognized", "The file is not a zip");

  let count = u16(tail, eocd + 10);
  let directorySize = u32(tail, eocd + 12);
  let directoryOffset = u32(tail, eocd + 16);
  if (count === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) {
    const locator = eocd - 20;
    if (locator < 0 || u32(tail, locator) !== 0x07064b50) throw damaged("directory");
    const record = await file.read(u64(tail, locator + 8), 56);
    if (u32(record, 0) !== 0x06064b50) throw damaged("directory");
    count = u64(record, 32);
    directorySize = u64(record, 40);
    directoryOffset = u64(record, 48);
  }
  if (directoryOffset + directorySize > file.size) throw damaged("directory");

  const directory = await file.read(directoryOffset, directorySize);
  const decoder = new TextDecoder();
  const entries = new Map<string, ZipEntry>();
  let at = 0;
  for (let i = 0; i < count; i++) {
    if (at + 46 > directory.length || u32(directory, at) !== 0x02014b50) throw damaged("directory");
    const flags = u16(directory, at + 8);
    const nameLength = u16(directory, at + 28);
    const extraLength = u16(directory, at + 30);
    const commentLength = u16(directory, at + 32);
    const name = decoder.decode(directory.subarray(at + 46, at + 46 + nameLength));
    let compressedSize = u32(directory, at + 20);
    let size = u32(directory, at + 24);
    let offset = u32(directory, at + 42);
    const extra = directory.subarray(at + 46 + nameLength, at + 46 + nameLength + extraLength);
    for (let e = 0; e + 4 <= extra.length; ) {
      const id = u16(extra, e);
      const length = u16(extra, e + 2);
      if (id === 0x0001) {
        let field = e + 4;
        if (size === 0xffffffff) {
          size = u64(extra, field);
          field += 8;
        }
        if (compressedSize === 0xffffffff) {
          compressedSize = u64(extra, field);
          field += 8;
        }
        if (offset === 0xffffffff) offset = u64(extra, field);
      }
      e += 4 + length;
    }
    if (flags & 1) throw new ImportFileError("unrecognized", "The file is encrypted");
    entries.set(name, { name, method: u16(directory, at + 10), compressedSize, size, offset });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** An entry's uncompressed bytes as a stream. */
export async function zipEntryStream(
  file: RandomAccess,
  entry: ZipEntry,
): Promise<ReadableStream<Uint8Array>> {
  const header = await file.read(entry.offset, 30);
  if (u32(header, 0) !== 0x04034b50) throw damaged("entry");
  const start = entry.offset + 30 + u16(header, 26) + u16(header, 28);
  const raw = await file.stream(start, entry.compressedSize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) {
    return raw.pipeThrough(
      new DecompressionStream("deflate-raw") as unknown as ReadableWritablePair<
        Uint8Array,
        Uint8Array
      >,
    );
  }
  throw new ImportFileError("unrecognized", "The file uses an unsupported compression");
}

/** An entry's bytes, refused past `limit` before anything is read. */
export async function readZipEntry(
  file: RandomAccess,
  entry: ZipEntry,
  limit: number,
): Promise<Uint8Array> {
  if (entry.size > limit) throw new ImportFileError("too_large", "An entry is too large");
  const out = new Uint8Array(entry.size);
  let filled = 0;
  for await (const chunk of await zipEntryStream(file, entry)) {
    if (filled + chunk.length > out.length) throw damaged("entry");
    out.set(chunk, filled);
    filled += chunk.length;
  }
  if (filled !== out.length) throw damaged("entry");
  return out;
}

/** Whether bytes start a zstd frame. */
export function isZstd(bytes: Uint8Array): boolean {
  return bytes[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd;
}

/**
 * Decompresses a zstd stream into one exactly sized buffer, refused past `limit`. The frame
 * need not declare its size: a first pass counts, a second fills, so memory never holds two
 * copies of the output.
 */
export async function zstdDecompress(
  input: () => Promise<ReadableStream<Uint8Array>>,
  limit: number,
): Promise<Uint8Array> {
  let size = 0;
  const count = new Decompress((chunk) => {
    size += chunk.length;
    if (size > limit) throw new ImportFileError("too_large", "The collection is too large");
  });
  await pump(await input(), count);

  const out = new Uint8Array(size);
  let filled = 0;
  const fill = new Decompress((chunk) => {
    if (filled + chunk.length > size) throw damaged("collection");
    out.set(chunk, filled);
    filled += chunk.length;
  });
  await pump(await input(), fill);
  if (filled !== size) throw damaged("collection");
  return out;
}

async function pump(stream: ReadableStream<Uint8Array>, decompress: Decompress) {
  try {
    for await (const chunk of stream) decompress.push(chunk);
    decompress.push(new Uint8Array(), true);
  } catch (err) {
    if (err instanceof ImportFileError) throw err;
    throw damaged("compression");
  }
}

/** zstd bytes already in memory, such as one media file. */
export function zstdDecompressBytes(bytes: Uint8Array, limit: number): Promise<Uint8Array> {
  return zstdDecompress(() => bytesSource(bytes).stream(0, bytes.length), limit);
}

/** One protobuf field: a varint as a number, or length-delimited bytes. Fixed widths are skipped. */
export type ProtoField = { number: number; varint?: number; bytes?: Uint8Array };

/** Decodes a protobuf message's top-level fields in order. Only what the adapters read is kept. */
export function decodeProto(bytes: Uint8Array): ProtoField[] {
  const fields: ProtoField[] = [];
  let at = 0;
  const varint = () => {
    let value = 0;
    let scale = 1;
    for (let i = 0; i < 10; i++) {
      if (at >= bytes.length) throw damaged("metadata");
      const byte = bytes[at++] as number;
      value += (byte & 0x7f) * scale;
      if (byte < 0x80) return value;
      scale *= 128;
    }
    throw damaged("metadata");
  };
  while (at < bytes.length) {
    const key = varint();
    const number = Math.floor(key / 8);
    const wire = key % 8;
    if (wire === 0) fields.push({ number, varint: varint() });
    else if (wire === 2) {
      const length = varint();
      if (at + length > bytes.length) throw damaged("metadata");
      fields.push({ number, bytes: bytes.subarray(at, at + length) });
      at += length;
    } else if (wire === 1) at += 8;
    else if (wire === 5) at += 4;
    else throw damaged("metadata");
  }
  return fields;
}

/** The first field with a number, as text, a number or bytes. */
export const proto = {
  text(fields: ProtoField[], number: number): string | undefined {
    const bytes = fields.find((f) => f.number === number)?.bytes;
    return bytes ? new TextDecoder().decode(bytes) : undefined;
  },
  varint(fields: ProtoField[], number: number): number | undefined {
    return fields.find((f) => f.number === number)?.varint;
  },
  message(fields: ProtoField[], number: number): ProtoField[] | undefined {
    const bytes = fields.find((f) => f.number === number)?.bytes;
    return bytes ? decodeProto(bytes) : undefined;
  },
  all(fields: ProtoField[], number: number): Uint8Array[] {
    return fields.flatMap((f) => (f.number === number && f.bytes ? [f.bytes] : []));
  },
};
