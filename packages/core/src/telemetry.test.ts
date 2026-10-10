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
