import assert from "node:assert/strict";
import test from "node:test";
import { baseUrl, cookieHeader, parseArgs, parseDevVars, run } from "./local.mjs";

test("parses a command, its arguments and options", () => {
  assert.deepEqual(parseArgs(["due", "5", "--as", "streak", "--url=http://localhost:4173"]), {
    command: "due",
    args: ["5"],
    options: { as: "streak", url: "http://localhost:4173" },
  });
  assert.deepEqual(parseArgs(["seed", "--reset"]).options, { reset: true });
  assert.equal(parseArgs(["--help"]).options.help, true);
});

test("picks the product origin in the documented order", () => {
  const vars = { PRODUCT_URL: "http://localhost:5241/" };
  assert.equal(baseUrl({ url: "http://a" }, { LYMI_URL: "http://b" }, vars), "http://a");
  assert.equal(baseUrl({}, { LYMI_URL: "http://b" }, vars), "http://b");
  assert.equal(baseUrl({}, {}, vars), "http://localhost:5241");
  assert.equal(baseUrl({}, {}, {}), "http://localhost:5241");
});

test("reads PRODUCT_URL out of a .dev.vars file and ignores comments", () => {
  const vars = parseDevVars("# comment\nPRODUCT_URL=http://localhost:5241\nEMPTY=\n");
  assert.equal(vars.PRODUCT_URL, "http://localhost:5241");
  assert.equal(vars.EMPTY, "");
});

test("folds Set-Cookie headers into one Cookie header", () => {
  assert.equal(
    cookieHeader([
      "lymi.session_token=abc; Path=/; HttpOnly; SameSite=Lax",
      "lymi_dev_persona=learner; Path=/",
    ]),
    "lymi.session_token=abc; lymi_dev_persona=learner",
  );
});

/** Runs the CLI against a stubbed server, recording each path it asked for. */
async function against(respond, argv) {
  const asked = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const path = new URL(url).pathname;
    asked.push(`${init?.method ?? "GET"} ${path}`);
    return respond(path);
  };
  try {
    await run(argv, { stdout: { write() {} }, env: { LYMI_URL: "http://localhost:5241" } });
    return { asked };
  } catch (error) {
    return { asked, error };
  } finally {
    globalThis.fetch = real;
  }
}

const listing = () => Response.json({ commands: [{ id: "forget" }] });

test("a typo is unknown before anyone is signed in", async () => {
  const { asked, error } = await against(listing, ["sed"]);
  assert.match(error.message, /Unknown command: sed/);
  assert.deepEqual(asked, ["GET /api/dev/commands"]);
});

test("a server that is down says the command may not exist", async () => {
  const { error } = await against(() => {
    throw new TypeError("fetch failed");
  }, ["sed"]);
  assert.match(error.message, /"sed" is not a built-in command/);
});

test("a known command signs in, then runs with its count", async () => {
  const { asked, error } = await against(
    (path) => {
      if (path === "/api/dev/commands") return listing();
      if (path === "/api/dev/sign-in") return Response.json({});
      return Response.json({
        note: "Forgot 3 cards.",
        counts: { decks: 1, cards: 3, due: 3, reviews: 3 },
      });
    },
    ["forget", "3"],
  );
  assert.equal(error, undefined);
  assert.deepEqual(asked, [
    "GET /api/dev/commands",
    "POST /api/dev/sign-in",
    "POST /api/dev/commands/forget",
  ]);
});
