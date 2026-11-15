import assert from "node:assert/strict";
import test from "node:test";
import { createClient, describeReport, main, parseArgs } from "./moderate.mjs";

const report = {
  id: "r1",
  status: "open",
  reason: "offensive",
  note: "Insults a group.",
  createdAt: "2026-10-24T08:00:00.000Z",
  resolvedAt: null,
  action: null,
  reporter: { id: "u1", name: "Lesia", email: "lesia@example.com" },
  owner: { id: "u2", name: "Mart", email: "mart@example.com" },
  deck: { id: "d1", name: "Eesti slang", members: 4 },
  card: { id: "c1", term: "kurat", meaning: "damn", example: null, notes: null },
  ownerReports: 2,
};

test("parses each command and refuses a write without --apply", () => {
  assert.deepEqual(parseArgs(["list"]), { command: "list", status: "open" });
  assert.deepEqual(parseArgs(["list", "--resolved"]), { command: "list", status: "resolved" });
  assert.deepEqual(parseArgs(["show", "r1"]), { command: "show", id: "r1" });
  assert.deepEqual(parseArgs(["resolve", "r1", "archive_card", "--apply"]), {
    command: "resolve",
    id: "r1",
    action: "archive_card",
  });
  assert.throws(() => parseArgs(["resolve", "r1", "archive_card"]), /--apply/);
  assert.throws(() => parseArgs(["resolve", "r1", "delete"]), /Usage/);
  assert.throws(() => parseArgs(["purge"]), /Usage/);
});

test("describes a report with its content, people and count", () => {
  const text = describeReport(report);
  assert.match(text, /OPEN/);
  assert.match(text, /Reason: Hateful or offensive/);
  assert.match(text, /Card: kurat \(c1\)/);
  assert.match(text, /Owner: Mart <mart@example.com>, 2 report/);
  assert.match(text, /Reporter: Lesia <lesia@example.com>, a member/);
});

test("resolves through the operator route with the key", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ ...report, status: "resolved", action: "dismiss" }));
  };
  const call = createClient({ key: "k", origin: "http://localhost", fetchImpl });
  const resolved = await call("POST", "/api/moderation/reports/r1/resolve", { action: "dismiss" });
  assert.equal(resolved.action, "dismiss");
  assert.equal(calls[0].url, "http://localhost/api/moderation/reports/r1/resolve");
  assert.equal(calls[0].init.headers["x-api-key"], "k");
});

test("needs a key", async () => {
  await assert.rejects(
    main(["list"], {}, () => {}),
    /LYMI_API_KEY/,
  );
});
