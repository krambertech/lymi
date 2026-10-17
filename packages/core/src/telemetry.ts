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

// Runtime-written messages that name a network or chunk failure, kept without the address they name.
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
];

function knownMessage(value: unknown): string {
  if (typeof value !== "string") return "Unexpected error";
  return KNOWN_MESSAGES.find(([pattern]) => pattern.test(value))?.[1] ?? "Unexpected error";
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

function position(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
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
            // PostHog rejects a Node or Hermes frame without a filename, and any frame without a function.
            const anonymous = !filename && platform !== "web:javascript";
            // The phone's uploaded source maps are found by the bundle's chunk ID.
            const chunkId =
              typeof frame.chunk_id === "string" && CHUNK_ID.test(frame.chunk_id)
                ? frame.chunk_id
                : undefined;
            return {
              platform,
              ...(filename ? { filename } : anonymous ? { filename: "<anonymous>" } : {}),
              ...(chunkId ? { chunk_id: chunkId } : {}),
              function:
                typeof frame.function === "string" && SAFE_FRAME.test(frame.function)
                  ? frame.function
                  : "?",
              ...(position(frame.lineno) ? { lineno: frame.lineno } : {}),
              ...(position(frame.colno) ? { colno: frame.colno } : {}),
              ...(anonymous && !chunkId
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
