/**
 * Writes a SQLite database page by page, the counterpart of the reader in `imports/sqlite.ts`.
 * Rows arrive in rowid order and fill leaf pages as they come, so the database is built without
 * holding rows; index keys are kept as numbers and sorted when their table closes. It writes
 * integer index keys only, which is all Anki's schema needs, and is checked against `node:sqlite`.
 */

export type SqlWriteValue = number | bigint | string | Uint8Array | null;

type Index = { name: string; sql: string; columns: number[] };

const HEADER = "SQLite format 3\u0000";
const TABLE_LEAF = 13;
const TABLE_INTERIOR = 5;
const INDEX_LEAF = 10;
const INDEX_INTERIOR = 2;

const encoder = new TextEncoder();

function varintLength(value: number): number {
  let length = 1;
  for (let v = value; v >= 128 && length < 9; v = Math.floor(v / 128)) length++;
  return length;
}

function writeVarint(out: Uint8Array, at: number, value: number): number {
  if (value < 0 || !Number.isSafeInteger(value)) throw new Error("Varints here are non-negative");
  const bytes: number[] = [];
  let v = value;
  do {
    bytes.unshift(v % 128);
    v = Math.floor(v / 128);
  } while (v > 0);
  for (let i = 0; i < bytes.length; i++) {
    out[at + i] = (bytes[i] as number) | (i < bytes.length - 1 ? 0x80 : 0);
  }
  return at + bytes.length;
}

function varint(value: number): Uint8Array {
  const out = new Uint8Array(varintLength(value));
  writeVarint(out, 0, value);
  return out;
}

/** The serial type and body bytes of one value, with integers in the fewest bytes. */
function serial(value: SqlWriteValue): [number, Uint8Array] {
  if (value === null) return [0, new Uint8Array()];
  if (typeof value === "string") {
    const bytes = encoder.encode(value);
    return [13 + bytes.length * 2, bytes];
  }
  if (value instanceof Uint8Array) return [12 + value.length * 2, value];
  if (typeof value === "number" && !Number.isInteger(value)) {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setFloat64(0, value);
    return [7, bytes];
  }
  const big = BigInt(value);
  if (big === 0n) return [8, new Uint8Array()];
  if (big === 1n) return [9, new Uint8Array()];
  const widths: [number, number][] = [
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 6],
    [6, 8],
  ];
  for (const [type, width] of widths) {
    const limit = 1n << BigInt(width * 8 - 1);
    if (big >= -limit && big < limit) {
      const bytes = new Uint8Array(width);
      let v = BigInt.asUintN(width * 8, big);
      for (let i = width - 1; i >= 0; i--) {
        bytes[i] = Number(v & 0xffn);
        v >>= 8n;
      }
      return [type, bytes];
    }
  }
  throw new Error("Integer out of range");
}

export function encodeRecord(values: readonly SqlWriteValue[]): Uint8Array {
  const parts = values.map(serial);
  const typesLength = parts.reduce((sum, [type]) => sum + varintLength(type), 0);
  let headerLength = typesLength + 1;
  while (varintLength(headerLength) + typesLength !== headerLength) {
    headerLength = varintLength(headerLength) + typesLength;
  }
  const bodyLength = parts.reduce((sum, [, body]) => sum + body.length, 0);
  const out = new Uint8Array(headerLength + bodyLength);
  let at = writeVarint(out, 0, headerLength);
  for (const [type] of parts) at = writeVarint(out, at, type);
  for (const [, body] of parts) {
    out.set(body, at);
    at += body.length;
  }
  return out;
}

export class SqliteWriter {
  private readonly pages: (Uint8Array | null)[] = [null];
  private readonly master: SqlWriteValue[][] = [];
  private readonly usable: number;

  constructor(readonly pageSize = 4096) {
    this.usable = pageSize;
  }

  /** Starts a table. Its rows must be inserted in rowid order before the next table starts. */
  table(name: string, sql: string, indexes: Index[] = []): TableWriter {
    return new TableWriter(this, name, sql, indexes);
  }

  get byteLength() {
    return this.pages.length * this.pageSize;
  }

  /** The database's pages in order, page one with the header and schema. */
  finish(): Uint8Array[] {
    const cells = this.master.map((values, i) => this.tableLeafCell(i + 1, encodeRecord(values)));
    const page = new Uint8Array(this.pageSize);
    if (!this.fits(cells, 100, 8)) throw new Error("The schema does not fit on the first page");
    this.layout(page, 100, TABLE_LEAF, cells);
    page.set(encoder.encode(HEADER), 0);
    const view = new DataView(page.buffer);
    view.setUint16(16, this.pageSize === 65536 ? 1 : this.pageSize);
    page[18] = 1;
    page[19] = 1;
    page[21] = 64;
    page[22] = 32;
    page[23] = 32;
    view.setUint32(24, 1);
    view.setUint32(28, this.pages.length);
    view.setUint32(40, 1);
    view.setUint32(44, 4);
    view.setUint32(56, 1);
    view.setUint32(92, 1);
    view.setUint32(96, 3045001);
    this.pages[0] = page;
    return this.pages as Uint8Array[];
  }

  /** @internal */
  addMaster(type: "table" | "index", name: string, table: string, root: number, sql: string) {
    this.master.push([type, name, table, root, sql]);
  }

  /** @internal Reserves a page number for a page written later. */
  allocate(): number {
    this.pages.push(null);
    return this.pages.length;
  }

  /** @internal */
  write(number: number, page: Uint8Array) {
    this.pages[number - 1] = page;
  }

  /** @internal A table leaf cell, spilling past the page onto overflow pages. */
  tableLeafCell(rowid: number, payload: Uint8Array): Uint8Array {
    const maxLocal = this.usable - 35;
    const head = [varint(payload.length), varint(rowid)];
    return this.cell(head, payload, maxLocal);
  }

  /** @internal An index cell's payload part, which must fit on its page. */
  indexPayload(payload: Uint8Array): Uint8Array {
    const maxLocal = Math.floor(((this.usable - 12) * 64) / 255) - 23;
    if (payload.length > maxLocal) throw new Error("Index keys here always fit on one page");
    const out = new Uint8Array(varintLength(payload.length) + payload.length);
    out.set(payload, writeVarint(out, 0, payload.length));
    return out;
  }

  private cell(head: Uint8Array[], payload: Uint8Array, maxLocal: number): Uint8Array {
    const headLength = head.reduce((sum, part) => sum + part.length, 0);
    let local = payload.length;
    if (payload.length > maxLocal) {
      const minLocal = Math.floor(((this.usable - 12) * 32) / 255) - 23;
      const k = minLocal + ((payload.length - minLocal) % (this.usable - 4));
      local = k <= maxLocal ? k : minLocal;
    }
    const spills = local < payload.length;
    const out = new Uint8Array(headLength + local + (spills ? 4 : 0));
    let at = 0;
    for (const part of head) {
      out.set(part, at);
      at += part.length;
    }
    out.set(payload.subarray(0, local), at);
    if (spills)
      new DataView(out.buffer).setUint32(at + local, this.overflow(payload.subarray(local)));
    return out;
  }

  /** Writes the rest of a payload as a chain of overflow pages and returns the first page. */
  private overflow(rest: Uint8Array): number {
    const chunk = this.usable - 4;
    const numbers: number[] = [];
    for (let at = 0; at < rest.length; at += chunk) numbers.push(this.allocate());
    numbers.forEach((number, i) => {
      const page = new Uint8Array(this.pageSize);
      new DataView(page.buffer).setUint32(0, numbers[i + 1] ?? 0);
      page.set(rest.subarray(i * chunk, (i + 1) * chunk), 4);
      this.write(number, page);
    });
    return numbers[0] as number;
  }

  /** @internal Whether cells fit on one page after a header of this size. */
  fits(cells: readonly Uint8Array[], offset: number, headerSize: number, extra = 0): boolean {
    let used = offset + headerSize;
    for (const cell of cells) used += cell.length + 2;
    return used + extra <= this.usable;
  }

  /** @internal Lays out a b-tree page: header, cell pointers, and cells packed from the end. */
  layout(page: Uint8Array, offset: number, type: number, cells: readonly Uint8Array[], right = 0) {
    const view = new DataView(page.buffer, page.byteOffset, page.byteLength);
    const interior = type === TABLE_INTERIOR || type === INDEX_INTERIOR;
    const headerSize = interior ? 12 : 8;
    let content = this.usable;
    cells.forEach((cell, i) => {
      content -= cell.length;
      page.set(cell, content);
      view.setUint16(offset + headerSize + i * 2, content);
    });
    page[offset] = type;
    view.setUint16(offset + 3, cells.length);
    view.setUint16(offset + 5, content === 65536 ? 0 : content);
    if (interior) view.setUint32(offset + 8, right);
  }

  /** @internal Writes a new page with these cells and returns its number. */
  page(type: number, cells: readonly Uint8Array[], right = 0): number {
    const number = this.allocate();
    const page = new Uint8Array(this.pageSize);
    this.layout(page, 0, type, cells, right);
    this.write(number, page);
    return number;
  }

  /** @internal Groups children under interior pages, at least two per page, until one root is left. */
  groups<T>(children: T[], cellOf: (child: T) => Uint8Array, headerSize: number): T[][] {
    const groups: T[][] = [];
    let i = 0;
    while (i < children.length) {
      let used = headerSize;
      let take = 1;
      while (i + take < children.length) {
        const next = cellOf(children[i + take - 1] as T);
        if (used + next.length + 2 > this.usable) break;
        used += next.length + 2;
        take++;
      }
      const remaining = children.length - i - take;
      if (remaining === 1 && take > 2) take--;
      groups.push(children.slice(i, i + take));
      i += take;
    }
    return groups;
  }
}

export class TableWriter {
  private cells: Uint8Array[] = [];
  private used = 8;
  private leaves: { page: number; key: number }[] = [];
  private lastRowid = 0;
  private count = 0;
  private readonly keys: Float64Array[];
  private readonly keyLength: number[];

  constructor(
    private readonly db: SqliteWriter,
    private readonly name: string,
    private readonly sql: string,
    private readonly indexes: Index[],
  ) {
    this.keys = indexes.map((index) => new Float64Array(1024 * (index.columns.length + 1)));
    this.keyLength = indexes.map(() => 0);
  }

  insert(rowid: number, values: readonly SqlWriteValue[]) {
    if (this.count > 0 && rowid <= this.lastRowid) throw new Error("Rows go in rowid order");
    const cell = this.db.tableLeafCell(rowid, encodeRecord(values));
    if (this.cells.length > 0 && this.used + cell.length + 2 > this.db.pageSize) this.flushLeaf();
    this.cells.push(cell);
    this.used += cell.length + 2;
    this.lastRowid = rowid;
    this.count++;
    this.indexes.forEach((index, i) => {
      const width = index.columns.length + 1;
      let keys = this.keys[i] as Float64Array;
      const at = this.keyLength[i] as number;
      if (at + width > keys.length) {
        const grown = new Float64Array(keys.length * 2);
        grown.set(keys);
        keys = grown;
        this.keys[i] = keys;
      }
      index.columns.forEach((column, c) => {
        const value = values[column];
        if (typeof value !== "number" || !Number.isSafeInteger(value)) {
          throw new Error("Index keys here are integers");
        }
        keys[at + c] = value;
      });
      keys[at + width - 1] = rowid;
      this.keyLength[i] = at + width;
    });
  }

  private flushLeaf() {
    this.leaves.push({ page: this.db.page(TABLE_LEAF, this.cells), key: this.lastRowid });
    this.cells = [];
    this.used = 8;
  }

  close() {
    if (this.cells.length > 0 || this.leaves.length === 0) this.flushLeaf();
    let level = this.leaves;
    while (level.length > 1) {
      const cellOf = (child: { page: number; key: number }) => {
        const key = varint(child.key);
        const cell = new Uint8Array(4 + key.length);
        new DataView(cell.buffer).setUint32(0, child.page);
        cell.set(key, 4);
        return cell;
      };
      level = this.db.groups(level, cellOf, 12).map((group) => {
        const right = group.at(-1) as { page: number; key: number };
        return {
          page: this.db.page(TABLE_INTERIOR, group.slice(0, -1).map(cellOf), right.page),
          key: right.key,
        };
      });
    }
    this.db.addMaster("table", this.name, this.name, (level[0] as { page: number }).page, this.sql);
    this.indexes.forEach((index, i) => {
      const root = this.writeIndex(
        index,
        this.keys[i] as Float64Array,
        this.keyLength[i] as number,
      );
      this.db.addMaster("index", index.name, this.name, root, index.sql);
    });
  }

  private writeIndex(index: Index, keys: Float64Array, length: number): number {
    const width = index.columns.length + 1;
    const rows = length / width;
    const order = new Uint32Array(rows);
    for (let i = 0; i < rows; i++) order[i] = i;
    const compare = (a: number, b: number) => {
      for (let c = 0; c < width; c++) {
        const diff = (keys[a * width + c] as number) - (keys[b * width + c] as number);
        if (diff !== 0) return diff;
      }
      return 0;
    };
    let sorted = true;
    for (let i = 1; i < rows && sorted; i++) sorted = compare(i - 1, i) <= 0;
    if (!sorted) order.sort(compare);
    const entry = (row: number) =>
      this.db.indexPayload(encodeRecord([...keys.subarray(row * width, (row + 1) * width)]));

    type Child = { page: number; divider?: Uint8Array };
    let children: Child[] = [];
    let cells: Uint8Array[] = [];
    let used = 8;
    for (const row of order) {
      const cell = entry(row);
      if (cells.length > 0 && used + cell.length + 2 > this.db.pageSize) {
        const divider = cells.pop() as Uint8Array;
        if (cells.length === 0) throw new Error("An index page holds at least two keys");
        children.push({ page: this.db.page(INDEX_LEAF, cells), divider });
        cells = [];
        used = 8;
      }
      cells.push(cell);
      used += cell.length + 2;
    }
    children.push({ page: this.db.page(INDEX_LEAF, cells) });

    while (children.length > 1) {
      const cellOf = (child: Child) => {
        const divider = child.divider as Uint8Array;
        const cell = new Uint8Array(4 + divider.length);
        new DataView(cell.buffer).setUint32(0, child.page);
        cell.set(divider, 4);
        return cell;
      };
      children = this.db.groups(children, cellOf, 12).map((group) => {
        const right = group.at(-1) as Child;
        const page = this.db.page(INDEX_INTERIOR, group.slice(0, -1).map(cellOf), right.page);
        return right.divider ? { page, divider: right.divider } : { page };
      });
    }
    return (children[0] as Child).page;
  }
}
