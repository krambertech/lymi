import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, describe, expect, it } from "vitest";
import { SqliteFile } from "../imports/sqlite";
import { SqliteWriter } from "./sqlite-writer";
import { concat } from "./zip";

const dir = mkdtempSync(join(tmpdir(), "lymi-sqlite-writer-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Opens written pages with real SQLite. */
function open(name: string, pages: Uint8Array[]) {
  const path = join(dir, name);
  writeFileSync(path, concat(pages));
  return new DatabaseSync(path, { readOnly: true });
}

describe("SqliteWriter", { timeout: 120_000 }, () => {
  it("writes tables and indexes that SQLite checks as sound and reads back", () => {
    for (const pageSize of [1024, 4096]) {
      const writer = new SqliteWriter(pageSize);
      const people = writer.table(
        "people",
        "CREATE TABLE people (id integer PRIMARY KEY, name text NOT NULL, n integer NOT NULL, r real, b blob, z text, m integer NOT NULL)",
        [
          { name: "ix_people_n", sql: "CREATE INDEX ix_people_n ON people (n)", columns: [2] },
          {
            name: "ix_people_nm",
            sql: "CREATE INDEX ix_people_nm ON people (n, m)",
            columns: [2, 6],
          },
        ],
      );
      const expected: unknown[][] = [];
      const ints = [
        0, 1, -1, 127, -128, 32767, -40000, 8388607, 2147483647, -2147483648, 140737488355327,
      ];
      for (let i = 1; i <= 6000; i++) {
        const id = 1_789_000_000_000 + i * 7;
        const name = i % 97 === 0 ? "漢字 Привіт ".repeat(400 + i) : `row ${i}`;
        const n = (ints[i % ints.length] as number) * (i % 3 ? 1 : -1) || i % 13;
        const blob = i % 211 === 0 ? new Uint8Array(9000).fill(i % 256) : null;
        const z = i % 5 ? null : "";
        people.insert(id, [null, name, n, i / 7, blob, z, (i * 7919) % 1000]);
        expected.push([id, name, n, i / 7, blob ? Buffer.from(blob).toString("hex") : null, z]);
      }
      people.close();
      writer
        .table("empty", "CREATE TABLE empty (a integer NOT NULL)", [
          { name: "ix_empty", sql: "CREATE INDEX ix_empty ON empty (a)", columns: [0] },
        ])
        .close();
      const pages = writer.finish();

      const db = open(`people-${pageSize}.db`, pages);
      expect(db.prepare("pragma integrity_check").all()).toEqual([{ integrity_check: "ok" }]);
      const rows = db
        .prepare("select id, name, n, r, hex(b) as b, z from people order by id")
        .all();
      expect(
        rows.map((row) => [
          row.id,
          row.name,
          row.n,
          row.r,
          row.b ? String(row.b).toLowerCase() : null,
          row.z,
        ]),
      ).toEqual(expected);
      // An index scan finds every row the table holds.
      const byIndex = db
        .prepare(
          "select count(*) as c from people indexed by ix_people_nm where n >= -999999999999999",
        )
        .get();
      expect(byIndex?.c).toBe(6000);
      const one = db
        .prepare("select id from people indexed by ix_people_n where n = ? order by id")
        .all(127);
      expect(one.length).toBeGreaterThan(0);
      expect(db.prepare("select count(*) as c from empty").get()?.c).toBe(0);
      db.close();

      // The import reader reads what the writer wrote.
      const read = [...new SqliteFile(concat(pages)).rows("people")];
      expect(read).toHaveLength(6000);
      expect(read[0]).toMatchObject({ id: 1_789_000_000_007, name: "row 1" });
    }
  });
});
