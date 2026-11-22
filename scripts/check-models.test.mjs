import assert from "node:assert/strict";
import test from "node:test";
import {
  confirmationsFor,
  fingerprint,
  guardsIn,
  parseTlc,
  staticProblems,
  verdicts,
  withGuardOff,
} from "./check-models.mjs";

const CONFIG = `SPECIFICATION Spec
CONSTANTS
  Writes = 2
  ChecksStatus = TRUE
INVARIANT NoLateWrite
CHECK_DEADLOCK FALSE
`;
const SOURCE = "export function write(a: number) {\n  return a + 1;\n}\n";
const REPLAY = 'it("writes nothing late", () => {});\n';
const MODELS = {
  Writes: {
    states: 10,
    invariants: ["NoLateWrite"],
    guards: { ChecksStatus: { breaks: "NoLateWrite", fixedIn: 1164 } },
    covers: { "writes.ts": ["write"] },
    replays: { "writes.test.ts": ["writes nothing late"] },
  },
};

function problemsWith({ models = MODELS, files = {}, config = CONFIG, names = ["Writes"] } = {}) {
  const all = { "writes.ts": SOURCE, "writes.test.ts": REPLAY, ...files };
  const confirmed = confirmationsFor(MODELS, () => SOURCE);
  return staticProblems(models, confirmed, {
    names,
    configOf: () => config,
    readFile: (file) => all[file],
    exists: (file) => all[file] !== undefined,
  });
}

const tlc = (states) => ({ status: 0, states, violated: null, output: "" });
const broken = (violated) => ({ status: 12, states: Number.NaN, violated, output: "" });

test("a model that matches its code and replays has no problems", () => {
  assert.deepEqual(problemsWith(), []);
});

test("changed code under a model asks for a new confirmation", () => {
  const [problem] = problemsWith({ files: { "writes.ts": SOURCE.replace("+ 1", "+ 2") } });
  assert.match(problem, /changed code that Writes models \(write\).*--confirm/);
});

test("comments and spacing are not a change", () => {
  const spaced = "// why\nexport function write(a: number) {\n\n  /* one */ return a + 1;\n}\n";
  assert.deepEqual(problemsWith({ files: { "writes.ts": spaced } }), []);
});

test("a covered function that moved is named", () => {
  const [problem] = problemsWith({ files: { "writes.ts": "export const other = 1;\n" } });
  assert.match(problem, /covers write in writes\.ts, which no longer exists/);
});

test("a deleted replay is named", () => {
  const [problem] = problemsWith({ files: { "writes.test.ts": "" } });
  assert.match(problem, /no longer holds the replay "writes nothing late"/);
});

test("a guard, a rule or a model left out of the manifest is named", () => {
  assert.match(
    problemsWith({ models: { Writes: { ...MODELS.Writes, guards: {} } } })[0],
    /guard ChecksStatus, but .* does not say which rule breaks/,
  );
  assert.match(
    problemsWith({ config: CONFIG.replace("INVARIANT NoLateWrite\n", "") })[0],
    /no longer checks NoLateWrite/,
  );
  assert.match(problemsWith({ names: ["Writes", "Other"] })[0], /Other\.tla has no entry/);
});

test("the default config may not turn a guard off", () => {
  assert.match(
    problemsWith({ config: withGuardOff(CONFIG, "ChecksStatus") })[0],
    /turns ChecksStatus off/,
  );
});

test("guards are the boolean constants", () => {
  assert.deepEqual(guardsIn(CONFIG), [{ name: "ChecksStatus", on: true }]);
});

test("a const function is fingerprinted too", () => {
  assert.deepEqual(fingerprint("a.ts", "const go = () => 1;", ["go"]).missing, []);
});

test("TLC's output gives the state count and the broken rule", () => {
  const passed = "650 states generated, 321 distinct states found, 0 states left on queue.";
  assert.deepEqual(parseTlc(passed, 0), { status: 0, states: 321, violated: null });
  assert.equal(parseTlc("Error: Invariant NoLateWrite is violated.", 12).violated, "NoLateWrite");
});

test("a model that holds and breaks without its guard passes", () => {
  const { problems } = verdicts(
    MODELS,
    () => CONFIG,
    (_, config) => (guardsIn(config)[0].on ? tlc(10) : broken("NoLateWrite")),
  );
  assert.deepEqual(problems, []);
});

test("a model that stops catching its bug fails", () => {
  const { problems } = verdicts(
    MODELS,
    () => CONFIG,
    () => tlc(10),
  );
  assert.match(problems[0], /without ChecksStatus should break NoLateWrite, the bug #1164 fixed/);
});

test("a model that reaches fewer states fails", () => {
  const { problems } = verdicts(
    MODELS,
    () => CONFIG,
    (_, config) => (guardsIn(config)[0].on ? tlc(1) : broken("NoLateWrite")),
  );
  assert.match(problems[0], /reached 1 states where .* records 10/);
});
