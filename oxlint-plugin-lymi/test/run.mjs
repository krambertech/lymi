import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const plugin = fileURLToPath(new URL("../index.mjs", import.meta.url));
const oxlint = fileURLToPath(new URL("../../node_modules/.bin/oxlint", import.meta.url));

export function lint(rule, filename, code, { options, files = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "oxlint-plugin-lymi-"));
  try {
    writeFileSync(
      join(dir, ".oxlintrc.json"),
      JSON.stringify({
        jsPlugins: [plugin],
        categories: { correctness: "off" },
        rules: { [`lymi/${rule}`]: options ? ["error", options(dir)] : "error" },
      }),
    );
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
    writeFileSync(join(dir, filename), code);
    let output;
    try {
      output = execFileSync(oxlint, ["-f", "json", filename], { cwd: dir, encoding: "utf8" });
    } catch (error) {
      output = error.stdout;
    }
    const source = Buffer.from(code);
    return JSON.parse(output).diagnostics.map((diagnostic) => {
      const { offset, length } = diagnostic.labels[0].span;
      return {
        code: diagnostic.code,
        message: diagnostic.message,
        text: source.subarray(offset, offset + length).toString(),
      };
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function testRule(rule, { message, valid, invalid }) {
  for (const { filename, code } of valid) {
    test(`${rule} allows ${code}`, () => {
      assert.deepEqual(lint(rule, filename, code), []);
    });
  }
  for (const { filename, code, errors } of invalid) {
    test(`${rule} reports ${code}`, () => {
      const diagnostics = lint(rule, filename, code);
      for (const diagnostic of diagnostics) {
        assert.equal(diagnostic.code, `lymi(${rule})`);
        assert.equal(diagnostic.message, message);
      }
      assert.deepEqual(diagnostics.map(({ text }) => text).sort(), [...errors].sort());
    });
  }
}
