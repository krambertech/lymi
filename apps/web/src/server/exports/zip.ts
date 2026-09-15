/**
 * Writes a zip in segments: each segment is a run of complete entries that starts at a known
 * offset, and the last holds the central directory. The segments concatenated are the file, so
 * a Workflow can write one per step and a route can stream them in order.
 */

/** Where one entry sits in the finished file, as its central directory record needs. */
export type ZipRecord = {
  name: string;
  method: 0 | 8;
  crc: number;
  compressedSize: number;
  size: number;
  offset: number;
};

/** Past these, a zip needs Zip64 records, which this writer leaves out. */
export const ZIP_MAX_BYTES = 0xffff_ffff;
export const ZIP_MAX_ENTRIES = 0xffff;

export class ZipTooLarge extends Error {
  constructor() {
    super("The export is too large for one zip");
    this.name = "ZipTooLarge";
  }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 of bytes, continuing from `crc` for data that arrives in pieces. */
export function crc32(bytes: Uint8Array, crc = 0): number {
  let c = ~crc >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    c = (CRC_TABLE[(c ^ (bytes[i] as number)) & 0xff] as number) ^ (c >>> 8);
  }
  return ~c >>> 0;
}

const encoder = new TextEncoder();
/** 1 January 2026, so the same content always writes the same bytes. */
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
/** Bit 11: names are UTF-8. */
const FLAGS = 0x0800;

function localHeader(name: Uint8Array, record: Omit<ZipRecord, "name" | "offset">) {
  const header = new Uint8Array(30 + name.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, FLAGS, true);
  view.setUint16(8, record.method, true);
  view.setUint16(10, DOS_TIME, true);
  view.setUint16(12, DOS_DATE, true);
  view.setUint32(14, record.crc, true);
  view.setUint32(18, record.compressedSize, true);
  view.setUint32(22, record.size, true);
  view.setUint16(26, name.length, true);
  header.set(name, 30);
  return header;
}

/** Collects chunks of compressed output while input is written, holding only the output. */
export class Deflater {
  private readonly writer: WritableStreamDefaultWriter<Uint8Array>;
  private readonly done: Promise<void>;
  readonly chunks: Uint8Array[] = [];
  crc = 0;
  size = 0;
  compressedSize = 0;

  constructor() {
    const stream = new CompressionStream("deflate-raw");
    this.writer = stream.writable.getWriter() as WritableStreamDefaultWriter<Uint8Array>;
    const reader = (stream.readable as ReadableStream<Uint8Array>).getReader();
    this.done = (async () => {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        this.chunks.push(value);
        this.compressedSize += value.length;
      }
    })();
  }

  async write(bytes: Uint8Array) {
    if (bytes.length === 0) return;
    this.crc = crc32(bytes, this.crc);
    this.size += bytes.length;
    await this.writer.write(bytes);
  }

  async close() {
    await this.writer.close();
    await this.done;
  }
}

/** A run of entries that begins at `offset` in the finished file. */
export class ZipSegment {
  readonly chunks: Uint8Array[] = [];
  readonly records: ZipRecord[] = [];
  length = 0;

  constructor(readonly offset: number) {}

  private push(bytes: Uint8Array) {
    this.chunks.push(bytes);
    this.length += bytes.length;
    if (this.offset + this.length > ZIP_MAX_BYTES) throw new ZipTooLarge();
  }

  /** Stores bytes as one entry. Text compresses; media that is already compressed is stored. */
  async add(name: string, bytes: Uint8Array, compress: boolean) {
    if (!compress) {
      this.entry(
        name,
        { method: 0, crc: crc32(bytes), compressedSize: bytes.length, size: bytes.length },
        [bytes],
      );
      return;
    }
    const deflater = new Deflater();
    await deflater.write(bytes);
    await deflater.close();
    this.addDeflated(name, deflater);
  }

  /** Adds an entry whose content was written through a closed `Deflater`. */
  addDeflated(name: string, deflater: Deflater) {
    this.entry(
      name,
      {
        method: 8,
        crc: deflater.crc,
        compressedSize: deflater.compressedSize,
        size: deflater.size,
      },
      deflater.chunks,
    );
  }

  private entry(name: string, record: Omit<ZipRecord, "name" | "offset">, data: Uint8Array[]) {
    if (record.size > ZIP_MAX_BYTES) throw new ZipTooLarge();
    const encoded = encoder.encode(name);
    const offset = this.offset + this.length;
    this.push(localHeader(encoded, record));
    for (const chunk of data) this.push(chunk);
    this.records.push({ name, offset, ...record });
  }

  bytes(): Uint8Array {
    return concat(this.chunks, this.length);
  }
}

/** The central directory and its end record, for entries written before `offset`. */
export function centralDirectory(records: readonly ZipRecord[], offset: number): Uint8Array {
  if (records.length > ZIP_MAX_ENTRIES) throw new ZipTooLarge();
  const parts: Uint8Array[] = [];
  let length = 0;
  for (const record of records) {
    const name = encoder.encode(record.name);
    const entry = new Uint8Array(46 + name.length);
    const view = new DataView(entry.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, FLAGS, true);
    view.setUint16(10, record.method, true);
    view.setUint16(12, DOS_TIME, true);
    view.setUint16(14, DOS_DATE, true);
    view.setUint32(16, record.crc, true);
    view.setUint32(20, record.compressedSize, true);
    view.setUint32(24, record.size, true);
    view.setUint16(28, name.length, true);
    view.setUint32(42, record.offset, true);
    entry.set(name, 46);
    parts.push(entry);
    length += entry.length;
  }
  if (offset + length + 22 > ZIP_MAX_BYTES) throw new ZipTooLarge();
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, records.length, true);
  view.setUint16(10, records.length, true);
  view.setUint32(12, length, true);
  view.setUint32(16, offset, true);
  parts.push(end);
  return concat(parts, length + 22);
}

export function concat(chunks: readonly Uint8Array[], length?: number): Uint8Array {
  const out = new Uint8Array(length ?? chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}
