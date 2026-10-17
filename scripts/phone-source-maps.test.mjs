import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const { bundleScript } = require("../apps/mobile/plugins/with-source-maps.cjs");
const original =
  "`\"$NODE_BINARY\" --print \"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\"`";

test("the embedded bundle uploads only during an EAS Release build", () => {
  const directory = mkdtempSync(join(tmpdir(), "phone-source-maps-"));
  try {
    const log = join(directory, "calls");
    const native = join(directory, "native");
    const upload = join(directory, "upload");
    const node = join(directory, "node");
    for (const [file, source] of [
      [native, 'echo bundle >> "$CALLS"'],
      [upload, 'echo upload >> "$CALLS"\n[ "$UPLOAD_FAIL" = "1" ] && exit 23\nexec "$@"'],
      [node, `case "$*" in *posthog-react-native*) echo '${upload}';; *) echo '${native}';; esac`],
    ]) {
      writeFileSync(file, `#!/bin/sh\n${source}\n`);
      chmodSync(file, 0o755);
    }
    const script = bundleScript(original);
    for (const [eas, configuration, key, expected, status, fail = ""] of [
      ["", "Release", "", "bundle\n", 0],
      ["true", "Debug", "", "bundle\n", 0],
      ["true", "Release", "test-key", "upload\nbundle\n", 0],
      ["true", "Release", "", "", 1],
      ["true", "Release", "test-key", "upload\n", 23, "1"],
    ]) {
      writeFileSync(log, "");
      const result = spawnSync("/bin/sh", ["-c", script], {
        env: {
          PATH: process.env.PATH,
          NODE_BINARY: node,
          CALLS: log,
          EAS_BUILD: eas,
          CONFIGURATION: configuration,
          POSTHOG_CLI_API_KEY: key,
          UPLOAD_FAIL: fail,
        },
        encoding: "utf8",
      });
      assert.equal(result.status, status, result.stderr);
      assert.equal(readFileSync(log, "utf8"), expected);
      if (!status) assert.equal(result.stdout, "");
      else if (status === 1) assert.match(result.stdout, /require POSTHOG_CLI_API_KEY/);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a changed native bundle phase fails instead of omitting source maps", () => {
  assert.throws(() => bundleScript("echo unexpected"), /bundle command missing/);
});

test("native and OTA uploads use the same CLI and event release coordinates", () => {
  const app = require("../apps/mobile/package.json");
  const workflow = readFileSync(
    new URL("../.github/workflows/phone-beta.yml", import.meta.url),
    "utf8",
  );
  const cli = workflow.match(/POSTHOG_CLI: "(@posthog\/cli@[\d.]+)"/)[1];
  assert.equal(app.scripts["eas-build-pre-install"], `npm install --global ${cli}`);
  assert.match(workflow, /--release-mode event/);
  assert.match(bundleScript(original), /POSTHOG_RELEASE_MODE=event/);
});
