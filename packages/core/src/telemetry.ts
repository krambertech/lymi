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
        value: "Unexpected error",
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
            const filename = scriptFilename(frame.filename);
            return {
              platform: PLATFORMS.has(frame.platform as string) ? frame.platform : "web:javascript",
              ...(filename ? { filename } : {}),
              // The phone's uploaded source maps are found by the bundle's chunk ID.
              ...(typeof frame.chunk_id === "string" && CHUNK_ID.test(frame.chunk_id)
                ? { chunk_id: frame.chunk_id }
                : {}),
              ...(typeof frame.function === "string" && SAFE_FRAME.test(frame.function)
                ? { function: frame.function }
                : {}),
              ...(typeof frame.lineno === "number" ? { lineno: frame.lineno } : {}),
              ...(typeof frame.colno === "number" ? { colno: frame.colno } : {}),
              ...(typeof frame.in_app === "boolean" ? { in_app: frame.in_app } : {}),
            };
          }),
        },
      };
    }),
  };
}

export const POSTHOG_PROJECT_TOKEN = "phc_mz7nfyKuwoSbZ787CAdbYhihXMEwYKbnNvGQ7LUuxPnU";
