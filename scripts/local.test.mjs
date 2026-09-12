import assert from "node:assert/strict";
import test from "node:test";
import { baseUrl, cookieHeader, parseArgs, parseDevVars } from "./local.mjs";

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
