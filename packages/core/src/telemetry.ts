export const POSTHOG_HOST = "https://eu.i.posthog.com";

const SAFE_FRAME = /^[a-zA-Z0-9_./:@<>$-]{1,300}$/;
const ERROR_TYPES = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "URIError",
  "EvalError",
  "AggregateError",
  "DOMException",
  "DrizzleQueryError",
  "WorkflowError",
]);

// Runtime-written messages that name a network, chunk or invocation-limit failure, kept without the address they name.
const KNOWN_MESSAGES: [RegExp, string][] = [
  [/^Load failed$/, "Load failed"],
  [/^Failed to fetch(?: \([^)]*\))?$/, "Failed to fetch"],
  [
    /^NetworkError when attempting to fetch resource\.$/,
    "NetworkError when attempting to fetch resource.",
  ],
  [/^Network request failed$/, "Network request failed"],
  [/^Importing a module script failed\.$/, "Importing a module script failed."],
  [/^Failed to fetch dynamically imported module: /, "Failed to fetch dynamically imported module"],
  [/^error loading dynamically imported module: /, "error loading dynamically imported module"],
  [/^Unable to preload CSS for /, "Unable to preload CSS"],
  [
    /^Too many API requests by single worker invocation/i,
    "Too many API requests by single worker invocation",
  ],
  [
    /^Too many subrequests by single worker invocation/i,
    "Too many subrequests by single worker invocation",
  ],
];

// D1's fixed failure messages from developers.cloudflare.com/d1/observability/debug-d1/, kept without any SQL that follows.
const D1_MESSAGES = [
  "Network connection lost",
  "Replica disconnected from primary",
  "Internal error in D1 DB storage caused object to be reset",
  "Internal error while starting up D1 DB storage caused object to be reset",
  "Cannot resolve D1 DB due to transient issue on remote node",
  "Can't read from request stream because client disconnected",
  "D1 DB storage operation exceeded timeout which caused object to be reset",
  "D1 DB reset because its code was updated",
  "D1 DB is overloaded. Requests queued for too long",
  "D1 DB is overloaded. Too many requests queued",
  "D1 DB's isolate exceeded its memory limit and was reset",
  "D1 DB exceeded its CPU time limit and was reset",
].map((message) => `D1_ERROR: ${message}`);

function knownMessage(value: unknown): string {
  if (typeof value !== "string") return "Unexpected error";
  return (
    D1_MESSAGES.find((message) => value.startsWith(message)) ??
    KNOWN_MESSAGES.find(([pattern]) => pattern.test(value))?.[1] ??
    "Unexpected error"
  );
}

const CHUNK_ID = /^[A-Za-z0-9-]{1,64}$/;

function scriptFilename(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  // Hermes names a release bundle's frames `address at /…/main.jsbundle`.
  const clean = value.replace(/^address at /, "").split(/[?#]/)[0] ?? "";
  if (/^https:\/\/my\.lymi\.app\/assets\/[A-Za-z0-9_.-]+\.m?js$/.test(clean)) return clean;
  const basename = clean.split("/").at(-1);
  if (basename && /^[A-Za-z0-9_.-]+\.(m?js|jsbundle|bundle|hbc)$/.test(basename)) return basename;
}

const PLATFORMS = new Set(["web:javascript", "node:javascript", "hermes"]);

// PostHog reads positions as u32 and subtracts 1 from a line before it looks up a source map.
function position(value: unknown, min: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= 0xffffffff;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

// Exception messages and SDK context can carry card text, SQL parameters or credentials.
export function exceptionProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const exceptions = Array.isArray(properties.$exception_list) ? properties.$exception_list : [];
  return {
    $exception_level: "error",
    $exception_list: exceptions.slice(0, 5).map((value, index) => {
      const exception = record(value);
      const trace = record(exception.stacktrace);
      const frames = Array.isArray(trace.frames) ? trace.frames : [];
      return {
        type:
          typeof exception.type === "string" && ERROR_TYPES.has(exception.type)
            ? exception.type
            : "Error",
        value: knownMessage(exception.value),
        mechanism: {
          type: "generic",
          handled: record(exception.mechanism).handled === true,
          synthetic: record(exception.mechanism).synthetic === true,
          exception_id: index,
        },
        stacktrace: {
          type: "raw",
          frames: frames.slice(-50).map((value) => {
            const frame = record(value);
            const platform = PLATFORMS.has(frame.platform as string)
              ? frame.platform
              : "web:javascript";
            const filename = scriptFilename(frame.filename);
            // The phone's uploaded source maps are found by the bundle's chunk ID.
            const chunkId =
              typeof frame.chunk_id === "string" && CHUNK_ID.test(frame.chunk_id)
                ? frame.chunk_id
                : undefined;
            return {
              platform,
              // PostHog rejects a Node or Hermes frame without a filename, and any frame without a function.
              ...(filename
                ? { filename }
                : platform !== "web:javascript"
                  ? { filename: "<anonymous>" }
                  : {}),
              ...(chunkId ? { chunk_id: chunkId } : {}),
              function:
                typeof frame.function === "string" && SAFE_FRAME.test(frame.function)
                  ? frame.function
                  : "?",
              ...(position(frame.lineno, 1) ? { lineno: frame.lineno } : {}),
              ...(position(frame.colno, 0) ? { colno: frame.colno } : {}),
              // A frame with neither is runtime, extension or page code, kept out of grouping.
              ...(!filename && !chunkId
                ? { in_app: false }
                : typeof frame.in_app === "boolean"
                  ? { in_app: frame.in_app }
                  : {}),
            };
          }),
        },
      };
    }),
  };
}

export const POSTHOG_PROJECT_TOKEN = "phc_mz7nfyKuwoSbZ787CAdbYhihXMEwYKbnNvGQ7LUuxPnU";
