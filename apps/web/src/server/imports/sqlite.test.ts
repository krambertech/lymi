import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, describe, expect, it } from "vitest";
import { ImportFileError } from "./files";
import { parseCreateTable, SqliteFile } from "./sqlite";

const dir = mkdtempSync(join(tmpdir(), "lymi-sqlite-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** A database written by real SQLite, read back as the bytes an import would hold. */
function build(name: string, pageSize: number, setup: (db: DatabaseSync) => void) {
  const path = join(dir, name);
  const db = new DatabaseSync(path);
  db.exec(`pragma page_size = ${pageSize}; pragma journal_mode = delete;`);
  setup(db);
  return { db, file: new SqliteFile(new Uint8Array(readFileSync(path))) };
}

function normalise(value: unknown) {
  return value instanceof Uint8Array ? Buffer.from(value).toString("hex") : value;
}

function rowsOf(rows: Iterable<Record<string, unknown>>) {
  return [...rows].map((row) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, normalise(v)])),
  );
}

describe("SqliteFile", () => {
  it("reads every value type, overflow pages and interior pages as SQLite wrote them", () => {
    for (const pageSize of [1024, 4096, 65536]) {
      const { db, file } = build(`types-${pageSize}.db`, pageSize, (db) => {
        db.exec(
          `create table t (id integer primary key, n integer, r real, s text, b blob, z text)`,
        );
        const insert = db.prepare("insert into t (id, n, r, s, b, z) values (?, ?, ?, ?, ?, ?)");
        const ints = [0, 1, -1, 127, -128, 32767, -40000, 8388607, 2147483647, -2147483648];
        const wide = [140737488355327, -140737488355328, 1789461439427, 9007199254740991];
        for (let i = 1; i <= 3000; i++) {
          const n = i % 2 ? (ints[i % ints.length] as number) : (wide[i % wide.length] as number);
          const big = i % 97 === 0 ? "漢字".repeat(3000 + i) : `row ${i} Привіт`;
          const blob =
            i % 211 === 0 ? new Uint8Array(70000).fill(i % 256) : new Uint8Array([i % 256]);
          insert.run(i * 3, n, i / 7, big, blob, i % 5 ? null : "");
        }
        insert.run(9_000_000_000, 2n ** 62n, -0.5, "last", null, null);
      });
      const expected = rowsOf(
        db.prepare("select * from t where id < 9000000000 order by id").all() as never,
      );
      const rows = rowsOf(file.rows("t"));
      expect(rows.slice(0, -1)).toEqual(expected);
      // Past 2^53 an integer stays exact as a bigint.
      expect(rows.at(-1)).toMatchObject({ id: 9_000_000_000, n: 2n ** 62n, r: -0.5 });
      db.close();
    }
  });

  it("reads WITHOUT ROWID tables in declared column order, interior records included", () => {
    const { db, file } = build("without-rowid.db", 1024, (db) => {
      db.exec(
        `create table fields (name text not null, config blob not null, ntid integer not null, ord integer not null, primary key (ntid, ord)) without rowid`,
      );
      const insert = db.prepare("insert into fields values (?, ?, ?, ?)");
      for (let i = 0; i < 2000; i++)
        insert.run(`field ${i} ${"x".repeat(i % 300)}`, new Uint8Array([i % 256, 1]), i % 40, i);
    });
    const expected = rowsOf(
      db.prepare("select name, config, ntid, ord from fields order by ntid, ord").all() as never,
    );
    expect(rowsOf(file.rows("fields"))).toEqual(expected);
    expect(file.columns("fields")).toEqual(["name", "config", "ntid", "ord"]);
    db.close();
  });

  it("finds tables case-insensitively and knows which are missing", () => {
    const { db, file } = build("names.db", 4096, (db) =>
      db.exec("create table Revlog (id integer primary key)"),
    );
    expect(file.hasTable("revlog")).toBe(true);
    expect(file.hasTable("notetypes")).toBe(false);
    db.close();
  });

  it("refuses bytes that are not a database, and a truncated one", () => {
    expect(
      () => new SqliteFile(new TextEncoder().encode("not a database at all".repeat(10))),
    ).toThrow(ImportFileError);
    const { db } = build("cut.db", 4096, (db) => {
      db.exec("create table t (s text)");
      for (let i = 0; i < 500; i++) db.prepare("insert into t values (?)").run("y".repeat(100));
    });
    db.close();
    const bytes = new Uint8Array(readFileSync(join(dir, "cut.db")));
    expect(() => [...new SqliteFile(bytes.subarray(0, 8192)).rows("t")]).toThrow(ImportFileError);
  });
});

describe("parseCreateTable", () => {
  it("skips comments and constraints and finds the rowid alias", () => {
    const info = parseCreateTable(
      `CREATE TABLE notes (
        id integer PRIMARY KEY,
        guid text NOT NULL,
        -- a comment, with a comma
        flds text NOT NULL,
        UNIQUE (guid)
      )`,
      2,
    );
    expect(info).toEqual({
      rootPage: 2,
      columns: ["id", "guid", "flds"],
      withoutRowid: false,
      order: [0],
    });
  });
  it("finds the rowid alias when constraints come before PRIMARY KEY", () => {
    expect(
      parseCreateTable("create table notetypes (id integer not null primary key, name text)", 4)
        .order,
    ).toEqual([0]);
    expect(parseCreateTable("create table t (id int primary key, name text)", 4).order).toEqual([
      -1,
    ]);
  });
  it("orders a WITHOUT ROWID table's key columns first", () => {
    expect(
      parseCreateTable(
        "create table config (usn integer, KEY text not null primary key, val blob) without rowid",
        3,
      ).order,
    ).toEqual([1, 0, 2]);
  });
});
