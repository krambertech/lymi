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

function scriptFilename(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  const clean = value.split(/[?#]/)[0] ?? "";
  if (/^https:\/\/my\.lymi\.app\/assets\/[A-Za-z0-9_.-]+\.m?js$/.test(clean)) return clean;
  const basename = clean.split("/").at(-1);
  if (basename && /^[A-Za-z0-9_.-]+\.m?js$/.test(basename)) return basename;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

// Exception messages and SDK context can carry card text, SQL parameters or credentials.
export function exceptionProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const exceptions = Array.isArray(properties.$exception_list) ? properties.$exception_list : [];
  return {
    $exception_list: exceptions.slice(0, 5).map((value) => {
      const exception = record(value);
      const trace = record(exception.stacktrace);
      const frames = Array.isArray(trace.frames) ? trace.frames : [];
      return {
        type:
          typeof exception.type === "string" && ERROR_TYPES.has(exception.type)
            ? exception.type
            : "Error",
        value: "Unexpected error",
        mechanism: { handled: record(exception.mechanism).handled === true },
        stacktrace: {
          type: "raw",
          frames: frames.slice(-50).map((value) => {
            const frame = record(value);
            const filename = scriptFilename(frame.filename);
            return {
              ...(filename ? { filename } : {}),
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
