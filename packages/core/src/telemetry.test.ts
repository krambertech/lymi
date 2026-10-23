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

it("keeps the chunk ID the web build injected for its source maps", () => {
  const sanitized = exceptionProperties({
    $exception_list: [
      {
        type: "TypeError",
        value: "private card",
        stacktrace: {
          frames: [
            {
              filename: "https://my.lymi.app/assets/index-abcd.js",
              function: "saveCard",
              lineno: 67,
              colno: 41493,
              chunk_id: "7f3e8a52-1c4b-5d6e-9f01-23456789abcd",
            },
            {
              platform: "node:javascript",
              filename: "index.js",
              function: "readPublicDeck",
              lineno: 9,
              chunk_id: "2b4c",
            },
          ],
        },
      },
    ],
  });
  expect(sanitized.$exception_list).toMatchObject([
    {
      stacktrace: {
        frames: [
          {
            platform: "web:javascript",
            filename: "https://my.lymi.app/assets/index-abcd.js",
            chunk_id: "7f3e8a52-1c4b-5d6e-9f01-23456789abcd",
          },
          { platform: "node:javascript", filename: "index.js", chunk_id: "2b4c" },
        ],
      },
    },
  ]);
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

it("gives every frame the filename and function PostHog's frame schema requires", () => {
  const sanitized = exceptionProperties({
    $exception_list: [
      {
        type: "Error",
        value: "D1_ERROR: private card",
        stacktrace: {
          frames: [
            { platform: "node:javascript", function: "Promise.all", in_app: true },
            {
              platform: "node:javascript",
              filename: "/private/worker/index.js",
              function: "readPublicDeck",
              lineno: 3,
              colno: 1.5,
            },
            { platform: "node:javascript", filename: "index.js", lineno: 0, colno: 2 ** 32 },
            { platform: "hermes", filename: "private native", function: "private name" },
            {
              platform: "hermes",
              filename: "private native",
              chunk_id: "0b5f6a1e-9d2c-4f7b-8e1a-3c4d5e6f7a8b",
              colno: 0,
              in_app: true,
            },
            { platform: "web:javascript", lineno: -1, in_app: true },
          ],
        },
      },
    ],
  });
  const [exception] = sanitized.$exception_list as { stacktrace: { frames: object[] } }[];
  expect(exception?.stacktrace.frames).toEqual([
    {
      platform: "node:javascript",
      filename: "<anonymous>",
      function: "Promise.all",
      in_app: false,
    },
    { platform: "node:javascript", filename: "index.js", function: "readPublicDeck", lineno: 3 },
    { platform: "node:javascript", filename: "index.js", function: "?" },
    { platform: "hermes", filename: "<anonymous>", function: "?", in_app: false },
    {
      platform: "hermes",
      filename: "<anonymous>",
      chunk_id: "0b5f6a1e-9d2c-4f7b-8e1a-3c4d5e6f7a8b",
      function: "?",
      colno: 0,
      in_app: true,
    },
    { platform: "web:javascript", function: "?", in_app: false },
  ]);
  expect(JSON.stringify(sanitized)).not.toContain("private");
});

it("keeps a runtime's network or chunk failure message without the address it names", () => {
  const sanitize = (value: string) =>
    exceptionProperties({ $exception_list: [{ type: "TypeError", value }] }).$exception_list as {
      value: string;
    }[];
  const values = [
    "Load failed",
    "Failed to fetch (my.lymi.app)",
    "Failed to fetch dynamically imported module: https://my.lymi.app/assets/private.js",
    "Importing a module script failed.",
    "Load failed because of a private card",
    "Failed to fetchprivate",
  ].map(sanitize);
  expect(values.map((list) => list[0]?.value)).toEqual([
    "Load failed",
    "Failed to fetch",
    "Failed to fetch dynamically imported module",
    "Importing a module script failed.",
    "Unexpected error",
    "Unexpected error",
  ]);
  expect(JSON.stringify(values)).not.toContain("private");
});

it("keeps D1's own failure class without the SQL or parameters that follow it", () => {
  const sanitized = exceptionProperties({
    $exception_list: [
      "Failed query: select * from cards where term = ?\nparams: private",
      "D1_ERROR: Network connection lost.",
      "D1_ERROR: D1 DB is overloaded. Too many requests queued.: SQLITE_BUSY private",
      "Too many API requests by single worker invocation.",
      "D1_ERROR: no such column: private: SQLITE_ERROR",
    ].map((value) => ({ type: "Error", value })),
  }).$exception_list as { value: string }[];
  expect(sanitized.map((exception) => exception.value)).toEqual([
    "Unexpected error",
    "D1_ERROR: Network connection lost",
    "D1_ERROR: D1 DB is overloaded. Too many requests queued",
    "Too many API requests by single worker invocation",
    "Unexpected error",
  ]);
  expect(JSON.stringify(sanitized)).not.toContain("private");
});
