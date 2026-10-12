import { expect, it } from "vitest";
import { exceptionProperties } from "./telemetry";

it("retains compiled stack locations while discarding private error context", () => {
  const sanitized = exceptionProperties({
    $current_url: "https://my.lymi.app/join/private-token",
    $exception_message: "private card",
    $exception_list: [
      {
        type: "TypeError",
        value: "private card",
        cause: "private email",
        mechanism: { handled: true, data: "private" },
        stacktrace: {
          frames: [
            {
              filename: "https://my.lymi.app/assets/index-abcd.js?token=private#private",
              function: "saveCard",
              lineno: 12,
              colno: 4,
              context_line: "private",
            },
            { filename: "https://my.lymi.app/join/private-token", vars: { secret: "private" } },
            { filename: "/Users/private-name/project/index.js", lineno: 22 },
          ],
        },
      },
    ],
  });
  expect(sanitized).toMatchObject({
    $exception_list: [
      {
        type: "TypeError",
        value: "Unexpected error",
        mechanism: { handled: true },
        stacktrace: {
          frames: [
            {
              filename: "https://my.lymi.app/assets/index-abcd.js",
              function: "saveCard",
              lineno: 12,
              colno: 4,
            },
            {},
            { filename: "index.js", lineno: 22 },
          ],
        },
      },
    ],
  });
  expect(JSON.stringify(sanitized)).not.toContain("private");
});

it("keeps a Hermes frame's bundle name and chunk ID for the phone's source maps", () => {
  const sanitized = exceptionProperties({
    $exception_list: [
      {
        type: "Error",
        value: "private card",
        stacktrace: {
          frames: [
            {
              platform: "hermes",
              filename:
                "address at /private/var/containers/Bundle/Application/private/Lymi.app/main.jsbundle",
              function: "saveCard",
              lineno: 1,
              colno: 40213,
              chunk_id: "0b5f6a1e-9d2c-4f7b-8e1a-3c4d5e6f7a8b",
            },
            { platform: "hermes", chunk_id: "private id with spaces" },
          ],
        },
      },
    ],
  });
  expect(sanitized).toMatchObject({
    $exception_list: [
      {
        stacktrace: {
          frames: [
            {
              platform: "hermes",
              filename: "main.jsbundle",
              function: "saveCard",
              lineno: 1,
              colno: 40213,
              chunk_id: "0b5f6a1e-9d2c-4f7b-8e1a-3c4d5e6f7a8b",
            },
            { platform: "hermes" },
          ],
        },
      },
    ],
  });
  expect(JSON.stringify(sanitized)).not.toContain("private");
});
