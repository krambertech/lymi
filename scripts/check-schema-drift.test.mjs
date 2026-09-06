import assert from "node:assert/strict";
import test from "node:test";
import { changedMigrationPaths } from "./check-schema-drift.mjs";

test("schema drift reports added, removed, and changed generated files", () => {
  const before = new Map([
    ["0000_init.sql", Buffer.from("initial")],
    ["meta/0000_snapshot.json", Buffer.from("before")],
    ["meta/removed.json", Buffer.alloc(0)],
  ]);
  const after = new Map([
    ["0000_init.sql", Buffer.from("initial")],
    ["0001_new.sql", Buffer.alloc(0)],
    ["meta/0000_snapshot.json", Buffer.from("after")],
  ]);

  assert.deepEqual(changedMigrationPaths(before, after), [
    "0001_new.sql",
    "meta/0000_snapshot.json",
    "meta/removed.json",
  ]);
});
