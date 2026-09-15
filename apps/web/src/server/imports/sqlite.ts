import { ImportFileError } from "./files";

/**
 * A read-only SQLite reader over the file's bytes. It walks table and index b-trees directly,
 * so a collection is held in memory once; a WASM build of SQLite would copy it into its own
 * heap and double that inside a Worker's 128 MB. It scans whole tables, which is all an
 * import needs, and reads UTF-8 databases only.
 */

export type SqlValue = number | bigint | string | Uint8Array | null;
export type SqlRow = Record<string, SqlValue>;

const damaged = () => new ImportFileError("damaged", "The collection database is damaged");
const HEADER = "SQLite format 3\u0000";

type TableInfo = { rootPage: number; columns: string[]; withoutRowid: boolean; order: number[] };

export class SqliteFile {
  private readonly view: DataView;
  private readonly pageSize: number;
  private readonly usable: number;
  private readonly pageCount: number;
  private readonly decoder = new TextDecoder();
  private readonly tables = new Map<string, TableInfo>();

  constructor(private readonly bytes: Uint8Array) {
    if (bytes.length < 100 || new TextDecoder().decode(bytes.subarray(0, 16)) !== HEADER) {
      throw new ImportFileError("unrecognized", "The collection is not a SQLite database");
    }
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const size = this.view.getUint16(16);
    this.pageSize = size === 1 ? 65536 : size;
    this.usable = this.pageSize - (bytes[20] ?? 0);
    if (this.view.getUint32(56) > 1) {
      throw new ImportFileError("unrecognized", "The collection uses an unsupported text encoding");
    }
    if (this.pageSize < 512 || bytes.length % this.pageSize !== 0) throw damaged();
    this.pageCount = bytes.length / this.pageSize;

    for (const row of this.scan(1, false)) {
      const [type, name, , rootPage, sql] = row.values;
      if (type !== "table" || typeof name !== "string" || typeof sql !== "string") continue;
      this.tables.set(name.toLowerCase(), parseCreateTable(sql, Number(rootPage)));
    }
  }

  hasTable(name: string): boolean {
    return this.tables.has(name.toLowerCase());
  }

  columns(name: string): string[] {
    return this.table(name).columns;
  }

  /** Every row of a table as column name to value. The rowid alias column holds the rowid. */
  *rows(name: string): Generator<SqlRow> {
    const table = this.table(name);
    const alias = table.withoutRowid ? -1 : (table.order[0] ?? -1);
    for (const { rowid, values } of this.scan(table.rootPage, table.withoutRowid)) {
      const row: SqlRow = {};
      table.columns.forEach((column, i) => {
        const stored = table.withoutRowid ? values[table.order.indexOf(i)] : values[i];
        row[column] =
          i === alias && stored === null && rowid !== undefined ? rowid : (stored ?? null);
      });
      yield row;
    }
  }

  private table(name: string): TableInfo {
    const table = this.tables.get(name.toLowerCase());
    if (!table) throw damaged();
    return table;
  }

  private page(number: number): number {
    if (number < 1 || number > this.pageCount) throw damaged();
    return (number - 1) * this.pageSize;
  }

  /** Records of a b-tree in key order. Index b-trees keep records in interior cells too. */
  private *scan(
    page: number,
    index: boolean,
    depth = 0,
  ): Generator<{ rowid?: number | bigint | undefined; values: SqlValue[] }> {
    // A b-tree deeper than this is a loop in a damaged file, not a real collection.
    if (depth > 40) throw damaged();
    const base = this.page(page);
    const header = page === 1 ? base + 100 : base;
    const type = this.bytes[header];
    const cells = this.view.getUint16(header + 3);
    if (type === 13 || type === 10) {
      for (let i = 0; i < cells; i++) {
        const at = base + this.view.getUint16(header + 8 + i * 2);
        yield type === 13 ? this.tableLeafCell(at) : { values: this.indexCell(at) };
      }
      return;
    }
    if (type !== 5 && type !== 2) throw damaged();
    for (let i = 0; i < cells; i++) {
      const at = base + this.view.getUint16(header + 12 + i * 2);
      yield* this.scan(this.view.getUint32(at), index, depth + 1);
      if (index) yield { values: this.indexCell(at + 4) };
    }
    yield* this.scan(this.view.getUint32(header + 8), index, depth + 1);
  }

  private tableLeafCell(at: number) {
    const [size, afterSize] = readVarint(this.bytes, at);
    const [rowid, start] = readVarint(this.bytes, afterSize);
    const payload = this.payload(start, Number(size), this.usable - 35);
    return { rowid, values: this.record(payload) };
  }

  private indexCell(at: number): SqlValue[] {
    const [size, start] = readVarint(this.bytes, at);
    const max = Math.floor(((this.usable - 12) * 64) / 255) - 23;
    return this.record(this.payload(start, Number(size), max));
  }

  /** A cell's payload, following overflow pages when it does not fit on its page. */
  private payload(start: number, size: number, maxLocal: number): Uint8Array {
    if (size <= maxLocal) return this.bytes.subarray(start, start + size);
    const minLocal = Math.floor(((this.usable - 12) * 32) / 255) - 23;
    const k = minLocal + ((size - minLocal) % (this.usable - 4));
    const local = k <= maxLocal ? k : minLocal;
    const out = new Uint8Array(size);
    out.set(this.bytes.subarray(start, start + local));
    let filled = local;
    let next = this.view.getUint32(start + local);
    let guard = 0;
    while (filled < size) {
      if (next === 0 || ++guard > this.pageCount) throw damaged();
      const base = this.page(next);
      const take = Math.min(this.usable - 4, size - filled);
      out.set(this.bytes.subarray(base + 4, base + 4 + take), filled);
      filled += take;
      next = this.view.getUint32(base);
    }
    return out;
  }

  private record(payload: Uint8Array): SqlValue[] {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const [headerSize, first] = readVarint(payload, 0);
    let at = first;
    const types: number[] = [];
    while (at < Number(headerSize)) {
      const [type, next] = readVarint(payload, at);
      types.push(Number(type));
      at = next;
    }
    let body = Number(headerSize);
    return types.map((type) => {
      const width = serialWidth(type);
      if (body + width > payload.length) throw damaged();
      const at = body;
      body += width;
      switch (type) {
        case 0:
          return null;
        case 1:
          return view.getInt8(at);
        case 2:
          return view.getInt16(at);
        case 3:
          return (view.getInt16(at) << 8) | (payload[at + 2] as number);
        case 4:
          return view.getInt32(at);
        case 5:
          return view.getInt16(at) * 0x1_0000_0000 + view.getUint32(at + 2);
        case 6:
          return narrow(view.getBigInt64(at));
        case 7:
          return view.getFloat64(at);
        case 8:
          return 0;
        case 9:
          return 1;
        default:
          if (type >= 12 && type % 2 === 0) return payload.slice(at, at + width);
          if (type >= 13) return this.decoder.decode(payload.subarray(at, at + width));
          throw damaged();
      }
    });
  }
}

function readVarint(bytes: Uint8Array, at: number): [number | bigint, number] {
  // Up to seven bytes fit a double exactly, which covers every size and almost every rowid.
  let value = 0;
  for (let i = 0; i < 7; i++) {
    const byte = bytes[at + i];
    if (byte === undefined) throw damaged();
    value = value * 128 + (byte & 0x7f);
    if (byte < 0x80) return [value, at + i + 1];
  }
  let big = BigInt(value);
  for (let i = 7; i < 9; i++) {
    const byte = bytes[at + i];
    if (byte === undefined) throw damaged();
    if (i === 8) return [narrow((big << 8n) | BigInt(byte)), at + 9];
    big = (big << 7n) | BigInt(byte & 0x7f);
    if (byte < 0x80) return [narrow(big), at + i + 1];
  }
  throw damaged();
}

function narrow(value: bigint): number | bigint {
  const signed = BigInt.asIntN(64, value);
  return signed >= BigInt(Number.MIN_SAFE_INTEGER) && signed <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(signed)
    : signed;
}

function serialWidth(type: number): number {
  if (type < 12) return [0, 1, 2, 3, 4, 6, 8, 8, 0, 0, 0, 0][type] ?? 0;
  return Math.floor((type - 12) / 2);
}

/**
 * Column names, the rowid alias and the stored column order from a CREATE TABLE statement.
 * A WITHOUT ROWID table stores its primary key columns first, then the rest in order.
 */
export function parseCreateTable(sql: string, rootPage: number): TableInfo {
  const text = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const open = text.indexOf("(");
  const close = text.lastIndexOf(")");
  if (open < 0 || close < open) throw damaged();
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text.slice(open + 1, close)) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  parts.push(current);

  const columns: string[] = [];
  const primary: string[] = [];
  let aliasColumn = -1;
  for (const part of parts.map((p) => p.trim()).filter(Boolean)) {
    const constraint = /^(constraint\s+\S+\s+)?primary\s+key\s*\(([^)]*)\)/i.exec(part);
    if (constraint) {
      primary.push(
        ...(constraint[2] as string).split(",").map((c) => unquote(c.trim().split(/\s+/)[0] ?? "")),
      );
      continue;
    }
    if (/^(constraint|unique|check|foreign)\b/i.test(part)) continue;
    const name = unquote(part.split(/\s+/)[0] ?? "");
    columns.push(name);
    if (/\bprimary\s+key\b/i.test(part)) {
      primary.push(name);
      if (/^\S+\s+integer\s+primary\s+key\b/i.test(part)) aliasColumn = columns.length - 1;
    }
  }
  const withoutRowid = /\)\s*without\s+rowid\s*$/i.test(text.trim());
  const lower = columns.map((c) => c.toLowerCase());
  const keyIndexes = primary.map((p) => lower.indexOf(p.toLowerCase())).filter((i) => i >= 0);
  const order = withoutRowid
    ? [...keyIndexes, ...columns.map((_, i) => i).filter((i) => !keyIndexes.includes(i))]
    : [aliasColumn];
  return { rootPage, columns, withoutRowid, order };
}

function unquote(name: string): string {
  return name.replace(/^["'`[]|["'`\]]$/g, "");
}
